#!/usr/bin/env python3
"""Generate a private, repeatable SQL import from a read-only Orbit snapshot.

Output contains customer records and password hashes. Never commit generated files.
Uses existing workspace boundaries to keep imported owners' execution separate.
Source-only workflows remain available through the explicitly authorized history view.
"""
import argparse,base64,collections,hashlib,json,os,pathlib

def build(snapshot):
 data=snapshot['data']; captured=snapshot['timestamp']; statements=[]; counts=collections.Counter()
 def q(value):
  if value is None:return 'NULL'
  if isinstance(value,(int,float)):return str(value)
  return "'"+str(value).replace("'","''")+"'"
 def upsert(table,row,keys=('id',)):
  columns=list(row);update=[c for c in columns if c not in keys]
  revision_guard = ' WHERE excluded.updated_at >= '+table+'.updated_at' if table in {'users','accounts','contacts','tasks','communication_events'} else ''
  statements.append('INSERT INTO '+table+' ('+','.join(columns)+') VALUES ('+','.join(q(row[c]) for c in columns)+') ON CONFLICT ('+','.join(keys)+') DO UPDATE SET '+','.join(c+'=excluded.'+c for c in update)+revision_guard+';')
  counts[table]+=1
 def ident(table,source):return 'orbit:'+table+':'+source
 statements.append("DELETE FROM legacy_record_access WHERE record_id LIKE 'orbit:%';")
 users={r['id']:r for r in data['users']};accounts={r['id']:r for r in data['accounts']};contacts={r['id']:r for r in data['contacts']}
 memberships=collections.defaultdict(list)
 for row in data['memberships']: memberships[row['workspace_id']].append(row)
 def user_id(source):return ident('users',source)
 def workspace_id(source,owner):return ident('workspace',source+':'+owner)
 def account_workspace(a):return workspace_id(a['workspace_id'],a['owner_id'])
 for u in users.values():
  upsert('users',dict(id=user_id(u['id']),email=u['email'],name=u['name'],password_hash=u['password_hash'],status='active' if u['active'] else 'inactive',created_at=u['created_at'],updated_at=u['updated_at']))
 for w in data['workspaces']:
  tid=ident('team',w['id'])
  for table,column in [('team_members','team_id'),('legacy_memberships','team_id')]:
   statements.append('DELETE FROM '+table+' WHERE '+column+'='+q(tid)+';')
  statements.append('DELETE FROM workspace_members WHERE workspace_id IN (SELECT workspace_id FROM legacy_workspace_owners WHERE source_workspace_id='+q(w['id'])+');')
  upsert('teams',dict(id=tid,name=w['name'],slug='orbit-'+w['id'],created_at=w['created_at'],updated_at=w['updated_at']))
  for m in memberships[w['id']]:
   u=users[m['user_id']];role={'founder':'owner','manager':'admin','ic':'member'}[m['role']];wid=workspace_id(w['id'],u['id'])
   upsert('team_members',dict(id=ident('member',w['id']+':'+u['id']),team_id=tid,user_id=user_id(u['id']),role=role,created_at=m['joined_at'],updated_at=m['joined_at']))
   upsert('workspaces',dict(id=wid,team_id=tid,name=u['name']+' · records',slug='owner-'+u['id'],created_at=w['created_at'],updated_at=w['updated_at']))
   upsert('workspace_members',dict(id=ident('workspace-member',w['id']+':'+u['id']),workspace_id=wid,user_id=user_id(u['id']),role=role,created_at=m['joined_at'],updated_at=m['joined_at']))
   upsert('legacy_memberships',dict(source_workspace_id=w['id'],user_id=user_id(u['id']),team_id=tid,role=m['role']),('source_workspace_id','user_id'))
   upsert('legacy_workspace_owners',dict(workspace_id=wid,source_workspace_id=w['id'],owner_id=user_id(u['id'])),('workspace_id',))
 for a in accounts.values():
  upsert('accounts',dict(id=ident('accounts',a['id']),workspace_id=account_workspace(a),name=a['name'],domain=a.get('domain'),segment='product',source=a.get('source'),observation='\n\n'.join(str(a.get(k)) for k in ['fit_summary','evidence_summary','trigger_summary','next_action'] if a.get(k)),status={'research':'researching','approved':'target','disqualified':'disqualified','nurture':'target','active':'contacted','pending_approval':'researching'}[a['status']],owner=users[a['owner_id']]['name'],created_at=a['created_at'],updated_at=a['updated_at']))
 for c in contacts.values():
  upsert('contacts',dict(id=ident('contacts',c['id']),account_id=ident('accounts',c['account_id']),name=c.get('display_name') or ' '.join(str(c.get(k) or '') for k in ['first_name','last_name']).strip(),email=c.get('email') or '',title=c.get('title'),linkedin_url=c.get('linkedin_url'),phone=c.get('phone'),status='unsubscribed' if c.get('archived_at') or c.get('consent_status')=='opted_out' else {'identified':'new','verified':'active','contacted':'active','engaged':'replied','qualified':'active','not_interested':'unsubscribed','invalid':'bounced'}[c['status']],notes=c.get('notes'),created_at=c['created_at'],updated_at=c['updated_at']))
 for t in data['work_items']:
  aid=t['entity_id'] if t['entity_type']=='account' else contacts.get(t['entity_id'],{}).get('account_id') if t['entity_type']=='contact' else None
  cid=t['entity_id'] if t['entity_type']=='contact' else None
  upsert('tasks',dict(id=ident('work_items',t['id']),workspace_id=workspace_id(t['workspace_id'],t['owner_id']),account_id=ident('accounts',aid) if aid else None,contact_id=ident('contacts',cid) if cid else None,title=t['title'],kind='research',due_at=t.get('due_at'),status='done' if t['status']=='done' else 'open',notes='\n\n'.join(str(t.get(k)) for k in ['description','blocked_reason'] if t.get(k))+ '\n\nOriginal status: '+t['status']+'; priority: '+str(t.get('priority')),created_at=t['created_at'],updated_at=t['updated_at']))
 for a in data['activities']:
  upsert('communication_events',dict(id=ident('activities',a['id']),workspace_id=account_workspace(accounts[a['account_id']]),account_id=ident('accounts',a['account_id']),contact_id=ident('contacts',a['contact_id']) if a.get('contact_id') else None,created_by_user_id=user_id(a['actor_id']) if a.get('actor_id') else None,type='note',direction='internal',outcome=None,subject=a['type']+' · '+a['status'],body=json.dumps({k:a[k] for k in ['type','status','outcome','details','due_at']},ensure_ascii=False),occurred_at=a['occurred_at'] or a['created_at'],created_at=a['created_at'],updated_at=a['created_at']))
 # Source credentials, sessions, API keys and password hashes never enter the history API.
 excluded={'sessions','agent_tokens','invitations','auth_rate_limits','schema_migrations','linkedin_extension_tokens','linkedin_extension_authorization_codes'}
 mailboxes={r['id']:r for r in data['mailboxes']}; messages={r['id']:r for r in data['mail_messages']};drafts={r['id']:r for r in data['mail_drafts']};batches={r['id']:r for r in data.get('import_batches',[])}
 conversations=collections.defaultdict(set)
 for r in data['mail_conversation_mailboxes']:conversations[r['conversation_id']].add(r['mailbox_id'])
 tables={t:{r['id']:r for r in rows if 'id'in r} for t,rows in data.items()}
 def mailbox_acl(mid):
  m=mailboxes[mid]
  return {m['owner_id']} if m['kind']=='private' else {m['user_id'] for m in memberships[m['workspace_id']]}
 def acl(table,r):
  wid=r.get('workspace_id');members=memberships.get(wid,[]);admins={m['user_id'] for m in members if m['role'] in ('founder','manager')}
  if table=='mailboxes':return mailbox_acl(r['id'])
  if table in ('mail_messages','mail_drafts','mail_conversation_mailboxes'):return mailbox_acl(r['mailbox_id'])
  if table=='mail_conversations':return set().union(*(mailbox_acl(mid) for mid in conversations[r['id']]))
  if table=='mail_attachments':
   parent=messages.get(r.get('message_id')) or drafts.get(r.get('draft_id'));return mailbox_acl(parent['mailbox_id']) if parent else set()
  if table=='users':return {r['id']}|{m['user_id'] for v in memberships.values() for m in v if m['role'] in ('founder','manager')}
  if table=='workspaces':return {m['user_id'] for m in memberships[r['id']]}
  owner=r.get('owner_id') or r.get('actor_id');result=set(admins)
  if owner:result.add(owner)
  if table=='contacts':result.add(accounts[r['account_id']]['owner_id'])
  if r.get('account_id') in accounts:result.add(accounts[r['account_id']]['owner_id'])
  if r.get('contact_id') in contacts:result.add(contacts[r['contact_id']]['owner_id'])
  if table=='outreach_messages':return acl('outreach_sequences',tables['outreach_sequences'][r['sequence_id']])
  if table=='contact_channel_states':return acl('contacts',contacts[r['contact_id']])
  if table=='import_records' and r.get('batch_id') in batches:result.add(batches[r['batch_id']]['owner_id'])
  if table=='assets' and r.get('status') in ('approved','published'):result|={m['user_id'] for m in members}
  return result-{None}
 for table,rows in data.items():
  if table in excluded:continue
  for i,source in enumerate(rows):
   r=dict(source);sid=str(r.get('id') or ':'.join(str(r[k]) for k in sorted(r) if k.endswith('_id')) or i);rid=ident(table,sid)
   title=str(r.get('title') or r.get('subject') or r.get('name') or r.get('filename') or r.get('label') or table+' '+sid)
   if table=='users':r.pop('password_hash',None)
   if table=='mail_attachments':
    content=r.pop('content');binary=bytes(content['data']);assert len(binary)==r['size_bytes']
    r['attachment_download']=True;r['sha256']=hashlib.sha256(binary).hexdigest();encoded=base64.b64encode(binary).decode()
   payload=json.dumps(r,ensure_ascii=False,separators=(',',':'))
   upsert('legacy_records',dict(id=rid,source_table=table,source_id=sid,workspace_id=r.get('workspace_id'),title=title,payload_json=payload if len(payload)<=16000 else '{"_chunked":true}',created_at=r.get('created_at') or r.get('requested_at') or captured,updated_at=r.get('updated_at') or r.get('created_at') or captured))
   statements.append('DELETE FROM legacy_record_chunks WHERE record_id='+q(rid)+';')
   statements.append('DELETE FROM legacy_record_blobs WHERE record_id='+q(rid)+';')
   if len(payload)>16000:
    for j in range(0,len(payload),16000):upsert('legacy_record_chunks',dict(record_id=rid,chunk_index=j//16000,data=payload[j:j+16000]),('record_id','chunk_index'))
   if table=='mail_attachments':
    for j in range(0,len(encoded),16000):upsert('legacy_record_blobs',dict(record_id=rid,chunk_index=j//16000,data=encoded[j:j+16000]),('record_id','chunk_index'))
   for uid in acl(table,source):
    if uid in users:statements.append('INSERT OR IGNORE INTO legacy_record_access(record_id,user_id) VALUES ('+q(rid)+','+q(user_id(uid))+');')
 return statements,dict(counts)

def main():
 p=argparse.ArgumentParser();p.add_argument('snapshot');p.add_argument('output');args=p.parse_args()
 snapshot=json.loads(pathlib.Path(args.snapshot).read_text());sql,counts=build(snapshot)
 output=pathlib.Path(args.output);output.write_text('\n'.join(sql)+'\n');output.chmod(0o600)
 manifest={'source_captured_at':snapshot['timestamp'],'source_counts':{t:len(rows) for t,rows in snapshot['data'].items()},'target_upserts':counts,'sql_sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
 output.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
