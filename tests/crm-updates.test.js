import { test, expect, beforeEach, afterEach } from 'bun:test';
import { createD1 } from './helpers/d1.js';
import { extractCrmUpdates, reviewCrmUpdate, collectUpdateSources, handleRequest, readiness } from '../src/assistant/crm-updates.js';
let db, env, context, sent;
const change = overrides => ({ sourceId: 'mail:m', entityType: 'contact', entityId: 'c', field: 'title', value: 'VP Sales', quote: 'My title is now VP Sales.', ...overrides });
beforeEach(() => {
  db = createD1();
  db.sqlite.exec(`INSERT INTO users(id,email,name,created_at,updated_at) VALUES('u','u@example.com','User','2026','2026'),('other','other@example.com','Other','2026','2026');
    INSERT INTO workspaces(id,team_id,name,slug,created_at,updated_at) VALUES('elsewhere','team_default','Elsewhere','elsewhere','2026','2026');
    INSERT INTO accounts(id,name,workspace_id,created_at,updated_at) VALUES('a','Acme','workspace_default','2026','2026'),('b','Hidden','elsewhere','2026','2026');
    INSERT INTO contacts(id,account_id,name,email,title,created_at,updated_at) VALUES('c','a','Alice','alice@example.com','Sales','2026','2026'),('d','b','Hidden','hidden@example.com','Old','2026','2026');
    INSERT INTO assistant_mail_connections(id,workspace_id,user_id,provider,account_email,credentials,created_at) VALUES('x','workspace_default','u','gmail','u@example.com','opaque','2026'),('private','workspace_default','other','gmail','other@example.com','opaque','2026');
    INSERT INTO assistant_mail_messages(id,connection_id,workspace_id,user_id,provider_message_id,contact_id,from_email,to_json,subject,body,direction) VALUES('m','x','workspace_default','u','m','c','alice@example.com','[]','New role','My title is now VP Sales.','inbound'),('secret','private','workspace_default','other','secret','c','alice@example.com','[]','Secret','SECRET MATERIAL','inbound');`);
  context = { workspaceId: 'workspace_default', auth: { user: {id:'u'} }, helpers: { requireWorkspaceWrite: async (_,auth) => { if (auth.role === 'viewer') throw Object.assign(new Error('Forbidden'),{status:403}); } } };
  env = { DB: db.DB, OPENAI_API_KEY: 'test-key', ASSISTANT_FETCH: async (_, options) => { sent = JSON.parse(options.body); return Response.json({status:'completed',output_text:JSON.stringify({updates:[change()]})}); } };
});
afterEach(() => db.close());
async function proposal() { await extractCrmUpdates(env,context); return db.sqlite.prepare('SELECT * FROM assistant_crm_updates').get(); }

test('uses GPT-6 Luna strict schema and bounded own evidence; extraction never writes customer fields',async()=>{
  const result = await extractCrmUpdates(env,context);
  expect(result.created).toBe(1); expect(sent.model).toBe('gpt-6-luna'); expect(sent.store).toBe(false); expect(sent.text.format.strict).toBe(true);
  expect(sent.instructions).toContain('untrusted'); expect(sent.input).not.toContain('SECRET MATERIAL'); expect(sent.input).not.toContain('test-key');
  expect(db.sqlite.prepare("SELECT title FROM contacts WHERE id='c'").get().title).toBe('Sales');
  expect((await collectUpdateSources(env,{...context,workspaceId:'elsewhere'})).length).toBe(0);
});
test('requires explicit accept, preserves private queue and audits exactly once',async()=>{
  const row = await proposal();
  await expect(reviewCrmUpdate(env,{...context,auth:{user:{id:'other'}}},row.id,'accept')).rejects.toMatchObject({status:404});
  await expect(reviewCrmUpdate(env,{...context,auth:{user:{id:'u'},role:'viewer'}},row.id,'accept')).rejects.toMatchObject({status:403});
  await expect(reviewCrmUpdate(env,context,row.id,'send')).rejects.toMatchObject({status:400});
  const reviewed = await reviewCrmUpdate(env,context,row.id,'accept');
  expect(reviewed.status).toBe('accepted'); expect(reviewed.after_value).toBe('VP Sales'); expect(reviewed.review_token).toBeUndefined();
  expect(db.sqlite.prepare("SELECT title FROM contacts WHERE id='c'").get().title).toBe('VP Sales');
  await expect(reviewCrmUpdate(env,context,row.id,'accept')).rejects.toMatchObject({status:409});
  const audit = db.sqlite.prepare('SELECT * FROM audit_logs').all(); expect(audit.length).toBe(1); expect(audit[0].metadata_json).not.toContain('My title');
});
test('stale proposals cannot overwrite edits; rejected and duplicate proposals stay reviewed',async()=>{
  const row = await proposal();
  db.sqlite.exec("UPDATE contacts SET title='Director',updated_at='2027' WHERE id='c'");
  await expect(reviewCrmUpdate(env,context,row.id,'accept')).rejects.toMatchObject({status:409});
  expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n).toBe(0);
  await reviewCrmUpdate(env,context,row.id,'reject');
  expect(db.sqlite.prepare("SELECT title FROM contacts WHERE id='c'").get().title).toBe('Director');
  db.sqlite.exec("UPDATE contacts SET title='Sales',updated_at='2026' WHERE id='c'");
  expect((await extractCrmUpdates(env,context)).created).toBe(0);
  expect(db.sqlite.prepare('SELECT status FROM assistant_crm_updates').get().status).toBe('rejected');
});
test('rejects invented citations, foreign targets, unsafe fields and invalid values',async()=>{
  env.ASSISTANT_FETCH = async()=>Response.json({output_text:JSON.stringify({updates:[null,change({quote:'Invented quote that is not real'}),change({entityId:'d'}),change({field:'owner',value:'admin'}),change({field:'linkedin_url',value:'https://evil.test/profile'}),change({field:'close_date',entityType:'opportunity',value:'tomorrow'})]})});
  expect((await extractCrmUpdates(env,context))).toMatchObject({created:0,skipped:6});
  expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM assistant_crm_updates').get().n).toBe(0);
});
test('fails clearly without key, incomplete output, provider error and oversized result',async()=>{
  expect(readiness({})).toEqual({configured:false,model:'gpt-6-luna',requiresReview:true});
  await expect(extractCrmUpdates({...env,OPENAI_API_KEY:undefined},context)).rejects.toMatchObject({status:503});
  for (const response of [Response.json({status:'incomplete',output_text:'{}'}),Response.json({error:'no'}, {status:401}),Response.json({output_text:JSON.stringify({updates:Array(21).fill(change())})})]) {
    await expect(extractCrmUpdates({...env,ASSISTANT_FETCH:async()=>response},context)).rejects.toMatchObject({status:503});
  }
});
test('skips disconnected mail and contact identity mismatches',async()=>{
  db.sqlite.exec("UPDATE assistant_mail_messages SET from_email='stranger@example.com' WHERE id='m'");
  expect((await collectUpdateSources(env,context)).length).toBe(0);
  db.sqlite.exec("UPDATE assistant_mail_messages SET from_email='alice@example.com' WHERE id='m'; UPDATE assistant_mail_connections SET status='disconnected' WHERE id='x'");
  expect((await collectUpdateSources(env,context)).length).toBe(0);
});
test('API lists only own proposals and never returns credentials',async()=>{
  await proposal();
  const response = await handleRequest(new Request('https://crm/api/assistant/updates'),env,{...context,path:'updates'});
  const result=await response.json(); expect(result.updates.length).toBe(1); expect(JSON.stringify(result)).not.toContain('test-key');
  const other = await handleRequest(new Request('https://crm/api/assistant/updates'),env,{...context,path:'updates',auth:{user:{id:'other'}}});
  expect((await other.json()).updates).toEqual([]);
});

test('personal calendar sources and briefs stay private and match only one explicit contact',async()=>{
  db.sqlite.exec(`INSERT INTO assistant_calendar_events(id,connection_id,workspace_id,user_id,provider_event_id,title,description,attendees_json,starts_at,updated_at) VALUES('meeting','x','workspace_default','u','g1','Review','My title is now VP Sales.','[{"email":"alice@example.com"}]','2026-12-01','2026'),('hidden-meeting','private','workspace_default','other','g2','Secret meeting','SECRET MEETING','[{"email":"alice@example.com"}]','2026-12-01','2026');`);
  const sources=await collectUpdateSources(env,context); expect(sources.some(item=>item.id==='meeting:meeting')).toBe(true); expect(JSON.stringify(sources)).not.toContain('SECRET MEETING');
  const {buildMeetingBrief}=await import('../src/assistant/intelligence.js');
  const brief=await buildMeetingBrief(env,context,'meeting'); expect(brief.contact.id).toBe('c'); expect(brief.account.id).toBe('a');
  await expect(buildMeetingBrief(env,{...context,auth:{user:{id:'other'}}},'meeting')).rejects.toMatchObject({status:404});
  db.sqlite.exec("UPDATE assistant_mail_connections SET status='disconnected' WHERE id='x'");
  await expect(buildMeetingBrief(env,context,'meeting')).rejects.toMatchObject({status:404});
});
test('meeting knowledge and transcript citations enforce personal and workspace scopes',async()=>{
  db.sqlite.exec(`INSERT INTO assistant_calendar_events(id,connection_id,workspace_id,user_id,provider_event_id,title,description,attendees_json,updated_at) VALUES('meeting','x','workspace_default','u','g1','Board review','Discuss renewal opportunities','[]','2026');
    INSERT INTO communication_events(id,workspace_id,account_id,contact_id,type,subject,transcript,occurred_at,created_at,updated_at) VALUES('call','workspace_default','a','c','call','Board call','The renewal has been discussed','2026','2026','2026');`);
  const {searchKnowledge}=await import('../src/assistant/knowledge.js');
  const own=await searchKnowledge(env,'workspace_default','renewal',{userId:'u'}); expect(own.sources.some(source=>source.type==='meeting')).toBe(true); expect(own.sources.some(source=>source.type==='communication')).toBe(true);
  const other=await searchKnowledge(env,'workspace_default','renewal',{userId:'other'}); expect(other.sources.some(source=>source.type==='meeting')).toBe(false);
});
test('migration policy still prevents contributor deal edits through AI acceptance',async()=>{
  db.sqlite.exec(`INSERT INTO legacy_memberships(source_workspace_id,user_id,team_id,role) VALUES('legacy','u','team_default','ic');
    INSERT INTO opportunities(id,workspace_id,account_id,contact_id,name,value_cents,created_at,updated_at) VALUES('deal','workspace_default','a','c','Acme rollout',100,'2026','2026');
    UPDATE assistant_mail_messages SET body='Acme rollout closes on 2026-12-15.' WHERE id='m';`);
  env.ASSISTANT_FETCH=async()=>Response.json({output_text:JSON.stringify({updates:[change({entityType:'opportunity',entityId:'deal',field:'close_date',value:'2026-12-15',quote:'Acme rollout closes on 2026-12-15.'})]})});
  const row=await proposal(); await expect(reviewCrmUpdate(env,context,row.id,'accept')).rejects.toMatchObject({status:403});
  expect(db.sqlite.prepare("SELECT value_cents FROM opportunities WHERE id='deal'").get().value_cents).toBe(100);
});
test('fails closed when model value is unsupported by its quoted evidence',async()=>{
  env.ASSISTANT_FETCH=async()=>Response.json({output_text:JSON.stringify({updates:[change({value:'CEO'}),change({field:'phone',value:'+15555555555'})]})});
  expect(await extractCrmUpdates(env,context)).toMatchObject({created:0,skipped:2});
});

test('AI monetary changes are disabled without an explicit CRM currency model',async()=>{
  db.sqlite.exec(`INSERT INTO opportunities(id,workspace_id,account_id,contact_id,name,value_cents,created_at,updated_at) VALUES('deal','workspace_default','a','c','Acme rollout',100,'2026','2026'); UPDATE assistant_mail_messages SET body='Acme rollout has a budget of USD 250 and EUR 300.' WHERE id='m';`);
  env.ASSISTANT_FETCH=async()=>Response.json({output_text:JSON.stringify({updates:[change({entityType:'opportunity',entityId:'deal',field:'value_cents',value:25000,quote:'Acme rollout has a budget of USD 250 and EUR 300.'})]})});
  expect(await extractCrmUpdates(env,context)).toMatchObject({created:0,skipped:1});
});
