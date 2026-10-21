import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { createD1 } from './helpers/d1.js';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import { assertContactOutreachAllowed, linkedLegacyTimeline, normalizeSuppression } from '../src/crm-execution.js';
mock.module('cloudflare:sockets',()=>({connect(){throw new Error('Network sends forbidden in core gap tests');}}));
const {default:worker}=await import('../src/worker.js');
let db,env;
beforeEach(()=>{
  db=createD1(); env={DB:db.DB,CRM_API_TOKEN:'core-test',CRM_FROM_EMAIL:'sender@example.test'};
  db.sqlite.exec(`INSERT INTO accounts(id,name,workspace_id,created_at,updated_at) VALUES('acme','Acme','workspace_default','2026','2026');
    INSERT INTO contacts(id,account_id,name,email,linkedin_url,phone,created_at,updated_at) VALUES('person','acme','Person','person@acme.test','https://www.linkedin.com/in/person','+15555550123','2026','2026');`);
});
afterEach(()=>db.close());
async function api(path,{method='GET',body,token=env.CRM_API_TOKEN}={}){
  return worker.fetch(new Request('https://crm.test/api/'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json','x-workspace-id':'workspace_default'},body:body===undefined?undefined:JSON.stringify(body)}),env);
}
async function suppress(kind,value){const response=await api('outreach-suppressions',{method:'POST',body:{kind,value,reason:'Requested no contact'}});expect(response.status).toBe(201);return response.json();}

test('suppression values normalize and invalid destinations are rejected',()=>{
  expect(normalizeSuppression('email','Person@Acme.Test')).toBe('person@acme.test');
  expect(normalizeSuppression('domain','https://acme.test/')).toBe('acme.test');
  expect(normalizeSuppression('linkedin','https://linkedin.com/in/Person/?trk=ignored')).toBe('https://www.linkedin.com/in/person');
  for(const [kind,value] of [['email','bad'],['domain','https://a.test/path'],['linkedin','https://evil.test/in/person'],['phone','123']])expect(()=>normalizeSuppression(kind,value)).toThrow();
});

test('workspace rules block domain subdomains and canonical LinkedIn and preserve unrelated recipients',async()=>{
  const rule=await suppress('domain','acme.test');
  await expect(assertContactOutreachAllowed(env,'workspace_default','someone@sub.acme.test')).rejects.toThrow('do-not-contact');
  await expect(assertContactOutreachAllowed(env,'workspace_default','someone@other.test')).resolves.toBeUndefined();
  await expect(assertContactOutreachAllowed(env,'different-workspace','person@acme.test')).resolves.toBeUndefined();
  expect((await api('outreach-suppressions/'+rule.id,{method:'DELETE'})).status).toBe(200);
  await suppress('linkedin','https://linkedin.com/in/person/');
  await expect(assertContactOutreachAllowed(env,'workspace_default',{id:'person'})).rejects.toThrow('do-not-contact');
  await expect(assertContactOutreachAllowed(env,'workspace_default','person@acme.test')).rejects.toThrow('do-not-contact');
});

test('suppression blocks manual email, AI outreach draft, enrollment, SMS and calls before delivery',async()=>{
  await suppress('email','person@acme.test');
  const sequence=db.sqlite.query('SELECT id FROM sequences LIMIT 1').get();
  db.sqlite.exec(`INSERT INTO workspace_message_channels(id,workspace_id,created_by_user_id,type,provider,name,status,config_json,created_at,updated_at) VALUES('sms','workspace_default','user_bootstrap','sms','twilio','SMS','active','{}','2026','2026'),('call','workspace_default','user_bootstrap','call','twilio','Call','active','{}','2026','2026')`);
  for(const [path,body] of [
    ['email/send',{contactId:'person',subject:'Hello',body:'Test'}],
    ['contacts/person/email-draft',{}],
    ['enrollments',{contactId:'person',sequenceId:sequence.id}],
    ['messages/send',{channelId:'sms',contactId:'person',body:'Hello'}],
    ['calls/start',{channelId:'call',contactId:'person'}],
  ]){
    const response=await api(path,{method:'POST',body});
    expect({path,status:response.status,error:response.status===409?null:await response.text()}).toEqual({path,status:409,error:null});
  }
  expect(db.sqlite.query('SELECT count(*) AS n FROM email_events').get().n).toBe(0);
  expect(db.sqlite.query('SELECT count(*) AS n FROM communication_events').get().n).toBe(0);
});

test('contact opt-out remains effective after removing a workspace rule',async()=>{
  const rule=await suppress('email','person@acme.test');
  db.sqlite.exec("UPDATE contacts SET status='unsubscribed' WHERE id='person'");
  await api('outreach-suppressions/'+rule.id,{method:'DELETE'});
  await expect(assertContactOutreachAllowed(env,'workspace_default','PERSON@ACME.TEST')).rejects.toThrow('opted out');
});

test('scheduled sequence detects rules added after enrollment without sending',async()=>{
  await api('me');
  const sequence=db.sqlite.query('SELECT id FROM sequences LIMIT 1').get();
  db.sqlite.prepare("INSERT INTO sequence_enrollments(id,sequence_id,contact_id,status,current_step_order,next_send_at,created_at,updated_at) VALUES('enrolled',?,'person','active',1,'2020','2020','2020')").run(sequence.id);
  await suppress('domain','acme.test');
  const response=await api('sequence/run',{method:'POST',body:{}});expect(response.status).toBe(200);
  const event=db.sqlite.query('SELECT status,error FROM email_events').get();
  expect(event.status).toBe('failed'); expect(event.error).toContain('do-not-contact');
});

test('structured qualification/contact and task changes preserve existing records',async()=>{
  const account=await api('accounts/acme',{method:'PATCH',body:{qualification:'Strong fit',evidence:'Buyer interview',nextAction:'Book discovery'}}); expect(account.status).toBe(200);
  expect((await account.json()).qualification).toBe('Strong fit');
  const contact=await api('contacts/person',{method:'PATCH',body:{buyerRole:'Champion',relationshipStatus:'Engaged',source:'Referral',evidence:'Introduction',nextAction:'Follow up'}});expect(contact.status).toBe(200);expect((await contact.json()).email).toBe('person@acme.test');
  const created=await api('tasks',{method:'POST',body:{title:'Discovery',accountId:'acme',priority:'high',status:'blocked',blockedReason:'Awaiting buyer',definitionOfDone:'Meeting held',ownerUserId:'user_bootstrap'}});expect(created.status).toBe(201);
  const task=await created.json();expect(task.priority).toBe('high');expect(task.owner_user_id).toBe('user_bootstrap');
  const completed=await api('tasks/'+task.id,{method:'PATCH',body:{status:'done'}});expect(completed.status).toBe(200);expect((await completed.json()).definition_of_done).toBe('Meeting held');
  expect(db.sqlite.query('SELECT count(*) AS n FROM contacts').get().n).toBe(1);
  expect(db.sqlite.query('PRAGMA foreign_key_check').all()).toEqual([]);
});

test('task owners, priority, blocked status and company hierarchy are validated',async()=>{
  for(const body of [{priority:'extreme'},{ownerUserId:'foreign-user'},{status:'blocked'},{status:'unknown'}])expect((await api('tasks',{method:'POST',body:{title:'Bad task',...body}})).status).toBe(400);
  expect((await api('accounts/acme',{method:'PATCH',body:{parentAccountId:'acme'}})).status).toBe(400);
  db.sqlite.exec("INSERT INTO accounts(id,name,workspace_id,parent_account_id,created_at,updated_at) VALUES('child','Child','workspace_default','acme','2026','2026')");
  expect((await api('accounts/acme',{method:'PATCH',body:{parentAccountId:'child'}})).status).toBe(400);
  expect(db.sqlite.query('SELECT count(*) AS n FROM tasks').get().n).toBe(0);
});

test('linked original history requires session identity and the original per-record ACL',async()=>{
  await api('me');
  db.sqlite.exec(`INSERT INTO legacy_records(id,source_table,source_id,title,payload_json,created_at,updated_at) VALUES
    ('visible','activities','v','Visible activity','{"account_id":"source-account"}','2026','2026'),
    ('private','mail_messages','p','Private message','{"account_id":"source-account"}','2026','2026');
    INSERT INTO legacy_record_access(record_id,user_id) VALUES('visible','user_bootstrap')`);
  const auth={kind:'session',user:{id:'user_bootstrap',status:'active'}};
  const timeline=await linkedLegacyTimeline(env,'account','orbit:accounts:source-account',auth);
  expect(timeline.map(item=>item.title)).toEqual(['Visible activity']);
  expect(JSON.stringify(timeline)).not.toContain('Private message');
  expect(await linkedLegacyTimeline(env,'account','orbit:accounts:source-account',{...auth,kind:'token'})).toEqual([]);
  expect(await linkedLegacyTimeline(env,'account','orbit:accounts:source-account',{...auth,user:{...auth.user,status:'disabled'}})).toEqual([]);
});

test('viewer may read rules but cannot change rules, qualification or tasks',async()=>{
  await api('me');
  db.sqlite.exec(`INSERT INTO users(id,email,name,created_at,updated_at) VALUES('viewer','viewer@example.test','Viewer','now','now');
    INSERT INTO team_members(id,team_id,user_id,role,created_at,updated_at) VALUES('vt','team_default','viewer','viewer','now','now');
    INSERT INTO workspace_members(id,workspace_id,user_id,role,created_at,updated_at) VALUES('vw','workspace_default','viewer','viewer','now','now')`);
  const token='viewer-gap-token',hash=new Bun.CryptoHasher('sha256').update(token).digest('hex');
  db.sqlite.prepare("INSERT INTO workspace_api_tokens(id,workspace_id,created_by_user_id,name,token_hash,created_at,updated_at) VALUES('vtoken','workspace_default','viewer','test',?,'now','now')").run(hash);
  expect((await api('outreach-suppressions',{token})).status).toBe(200);
  for(const [path,method,body] of [['outreach-suppressions','POST',{kind:'email',value:'a@b.test'}],['accounts/acme','PATCH',{qualification:'No'}],['contacts/person','PATCH',{buyerRole:'No'}],['tasks','POST',{title:'No'}]])expect((await api(path,{method,body,token})).status).toBe(403);
});

test('reply capture works for active contacts and never reactivates an opted-out contact',async()=>{
  await suppress('domain','acme.test');
  expect((await api('contacts/person/reply',{method:'POST',body:{}})).status).toBe(200);
  expect(db.sqlite.query("SELECT status FROM contacts WHERE id='person'").get().status).toBe('replied');
  db.sqlite.exec("UPDATE contacts SET status='unsubscribed' WHERE id='person'");
  expect((await api('contacts/person/reply',{method:'POST',body:{}})).status).toBe(200);
  expect(db.sqlite.query("SELECT status FROM contacts WHERE id='person'").get().status).toBe('unsubscribed');
  expect((await api('email/inbound',{method:'POST',body:{contactId:'person',subject:'A reply',body:'Inbound message'}})).status).toBe(201);
  expect(db.sqlite.query("SELECT status FROM contacts WHERE id='person'").get().status).toBe('unsubscribed');
});

test('in-progress and blocked tasks remain in active counts, overdue reports and suggested actions',async()=>{
  for(const status of ['open','in_progress','blocked']){
    const response=await api('tasks',{method:'POST',body:{title:status,accountId:'acme',status,dueAt:'2020-01-01',blockedReason:status==='blocked'?'Waiting':undefined}});expect(response.status).toBe(201);
  }
  const summary=await(await api('summary')).json(); expect(summary.dueTasks).toBe(3);
  const reports=await(await api('reports')).json();expect(reports.taskStatus.reduce((total,row)=>total+row.overdue,0)).toBe(3);
  const next=await(await api('next-best-actions')).json();expect(JSON.stringify(next)).toContain('in_progress');expect(JSON.stringify(next)).toContain('blocked');
});

test('global warmup execution respects workspace suppression before SMTP',async()=>{
  await suppress('domain','acme.test');
  db.sqlite.exec(`INSERT INTO warmup_mailboxes(id,email,created_at,updated_at) VALUES('mailbox','sender@example.test','2026','2026');
    INSERT INTO warmup_recipients(id,mailbox_id,email,created_at,updated_at) VALUES('recipient','mailbox','person@acme.test','2026','2026');
    INSERT INTO warmup_plans(id,mailbox_id,starts_on,ends_on,daily_min,daily_max,created_at,updated_at) VALUES('plan','mailbox','2020','2030',1,1,'2026','2026');
    INSERT INTO warmup_messages(id,plan_id,mailbox_id,recipient_id,scheduled_for,subject,body,created_at,updated_at) VALUES('warmup','plan','mailbox','recipient','2020','Test','Test','2026','2026')`);
  expect((await api('warmup/run',{method:'POST',body:{limit:1}})).status).toBe(200);
  const message=db.sqlite.query("SELECT status,error FROM warmup_messages WHERE id='warmup'").get();expect(message.status).toBe('failed');expect(message.error).toContain('do-not-contact');
});


test('merging imported accounts preserves qualification and permitted source history without hierarchy cycles',async()=>{
  await api('me');
  db.sqlite.exec(`UPDATE accounts SET qualification='Source qualification' WHERE id='acme';
    INSERT INTO accounts(id,name,workspace_id,parent_account_id,created_at,updated_at) VALUES('child','Child','workspace_default','acme','2026','2026'),('target','Target','workspace_default','child','2026','2026');
    INSERT INTO crm_legacy_entity_links(entity,entity_id,legacy_entity_id) VALUES('account','acme','source-account');
    INSERT INTO legacy_records(id,source_table,source_id,title,payload_json,created_at,updated_at) VALUES('merge-history','activities','merge-history','Preserved activity','{"account_id":"source-account"}','2026','2026');
    INSERT INTO legacy_record_access(record_id,user_id) VALUES('merge-history','user_bootstrap')`);
  const response=await api('accounts/target/merge',{method:'POST',body:{sourceAccountId:'acme'}});expect(response.status).toBe(200);
  const merged=await response.json();expect(merged.qualification).toBe('Source qualification');expect(merged.parent_account_id).toBeNull();
  expect(db.sqlite.query("SELECT parent_account_id FROM accounts WHERE id='child'").get().parent_account_id).toBe('target');
  const timeline=await linkedLegacyTimeline(env,'account','target',{kind:'session',user:{id:'user_bootstrap',status:'active'}});expect(timeline.map(item=>item.title)).toEqual(['Preserved activity']);
  expect(db.sqlite.query("SELECT payload_json FROM legacy_records WHERE id='merge-history'").get().payload_json).toBe('{"account_id":"source-account"}');
  expect(db.sqlite.query('PRAGMA foreign_key_check').all()).toEqual([]);
});

test('execution upgrade restores original structured fields, consent rules and unfinished task states without changing original history',()=>{
  const before=createD1({migrations:false});
  try {
    const dir=resolve(import.meta.dir,'../migrations');
    for(const file of readdirSync(dir).filter(file=>file.endsWith('.sql')&&file<'0055').sort())before.sqlite.exec(readFileSync(resolve(dir,file),'utf8'));
    before.sqlite.exec(`INSERT INTO accounts(id,name,workspace_id,created_at,updated_at) VALUES('orbit:accounts:parent','Parent','workspace_default','2026','2026'),('orbit:accounts:company','Company','workspace_default','2026','2026');
      INSERT INTO contacts(id,account_id,name,email,status,created_at,updated_at) VALUES('orbit:contacts:person','orbit:accounts:company','Person','person@example.test','unsubscribed','2026','2026');
      INSERT INTO tasks(id,title,workspace_id,status,created_at,updated_at) VALUES('orbit:work_items:task','Original task','workspace_default','open','2026','2026'),('ordinary','Existing task','workspace_default','open','2026','2026');
      INSERT INTO legacy_workspace_owners(workspace_id,source_workspace_id,owner_id) VALUES('workspace_default','source-workspace','user_bootstrap');
      INSERT INTO legacy_records(id,source_table,source_id,workspace_id,title,payload_json,created_at,updated_at) VALUES
      ('orbit:accounts:company','accounts','company','source-workspace','Company','{"fit_summary":"Strong fit","evidence_summary":"Buyer said so","next_action":"Discovery","parent_account_id":"parent"}','2026','2026'),
      ('orbit:contacts:person','contacts','person','source-workspace','Person','{"buyer_role":"Champion"}','2026','2026'),
      ('orbit:work_items:task','work_items','task','source-workspace','Task','{"priority":"high","status":"blocked","blocked_reason":"Waiting","definition_of_done":"Buyer approved"}','2026','2026'),
      ('suppressed','crm_suppressions','rule','source-workspace','Rule','{"kind":"email","value":"PERSON@EXAMPLE.TEST","reason":"Opt out","active":true}','2026','2026')`);
    const archive=before.sqlite.query('SELECT * FROM legacy_records ORDER BY id').all();
    before.sqlite.exec(readFileSync(resolve(dir,'0055_crm_execution_gaps.sql'),'utf8'));
    const account=before.sqlite.query("SELECT * FROM accounts WHERE id='orbit:accounts:company'").get();expect(account.qualification).toBe('Strong fit');expect(account.parent_account_id).toBe('orbit:accounts:parent');
    expect(before.sqlite.query("SELECT buyer_role,status FROM contacts WHERE id='orbit:contacts:person'").get()).toEqual({buyer_role:'Champion',status:'unsubscribed'});
    expect(before.sqlite.query("SELECT priority,status,blocked_reason,definition_of_done FROM tasks WHERE id='orbit:work_items:task'").get()).toEqual({priority:'high',status:'blocked',blocked_reason:'Waiting',definition_of_done:'Buyer approved'});
    expect(before.sqlite.query("SELECT priority,owner_user_id FROM tasks WHERE id='ordinary'").get()).toEqual({priority:'normal',owner_user_id:null});
    expect(before.sqlite.query('SELECT kind,value FROM outreach_suppressions').get()).toEqual({kind:'email',value:'person@example.test'});
    expect(before.sqlite.query('SELECT * FROM legacy_records ORDER BY id').all()).toEqual(archive);
    expect(before.sqlite.query('PRAGMA foreign_key_check').all()).toEqual([]);
  } finally {before.close();}
});
