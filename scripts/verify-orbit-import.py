#!/usr/bin/env python3
"""Reconcile a private Orbit snapshot with an offline exported target SQLite DB."""
import base64,hashlib,json,pathlib,sqlite3,sys
snapshot=json.loads(pathlib.Path(sys.argv[1]).read_text())
db=sqlite3.connect('file:'+str(pathlib.Path(sys.argv[2]).resolve())+'?mode=ro',uri=True)
assert not db.execute('PRAGMA foreign_key_check').fetchall(), 'Broken database references'
excluded={'sessions','agent_tokens','invitations','auth_rate_limits','schema_migrations','linkedin_extension_tokens','linkedin_extension_authorization_codes'}
records={r[0]:r[1:] for r in db.execute('SELECT id,source_table,source_id,payload_json FROM legacy_records')}
chunks={}
for rid,index,data in db.execute('SELECT record_id,chunk_index,data FROM legacy_record_chunks ORDER BY record_id,chunk_index'):chunks.setdefault(rid,[]).append(data)
verified=0;attachments=0
for table,rows in snapshot['data'].items():
 if table in excluded:continue
 assert sum(r[0]==table for r in records.values())==len(rows),table+' count differs'
 for i,source in enumerate(rows):
  row=dict(source);sid=str(row.get('id') or ':'.join(str(row[k]) for k in sorted(row) if k.endswith('_id')) or i);rid='orbit:'+table+':'+sid
  payload=json.loads(records[rid][2]);payload=json.loads(''.join(chunks[rid])) if payload.get('_chunked') else payload
  if table=='users':row.pop('password_hash',None)
  if table=='mail_attachments':
   original=bytes(row.pop('content')['data']);encoded=''.join(r[0] for r in db.execute('SELECT data FROM legacy_record_blobs WHERE record_id=? ORDER BY chunk_index',(rid,)));assert base64.b64decode(encoded)==original,'Attachment differs'
   row['attachment_download']=True;row['sha256']=hashlib.sha256(original).hexdigest();attachments+=1
  assert row==payload,table+' payload differs';verified+=1
for source,target in [('accounts','accounts'),('contacts','contacts'),('work_items','tasks'),('activities','communication_events')]:
 assert db.execute('SELECT COUNT(*) FROM '+target+" WHERE id LIKE 'orbit:%'").fetchone()[0]==len(snapshot['data'][source]),source+' native count differs'
for mailbox in snapshot['data']['mailboxes']:
 if mailbox['kind']=='private':
  actual={r[0] for r in db.execute('SELECT user_id FROM legacy_record_access WHERE record_id=?',('orbit:mailboxes:'+mailbox['id'],))};assert actual=={'orbit:users:'+mailbox['owner_id']},'Private mailbox ACL differs'
assert db.execute("SELECT COUNT(*) FROM sequence_enrollments WHERE id LIKE 'orbit:%'").fetchone()[0]==0,'Imported outreach was activated'
print(f'PASS: {verified} original business records, {attachments} byte-exact attachments, native counts, private mailbox access, no activated outreach, and foreign keys.')
