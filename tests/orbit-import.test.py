import copy,importlib.util,pathlib,sqlite3,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import-orbit-snapshot.py');importer=importlib.util.module_from_spec(spec);spec.loader.exec_module(importer)
NOW='2026-01-01T00:00:00Z'
def fixture():
 data={table:[] for table in ['users','workspaces','memberships','accounts','contacts','work_items','activities','mailboxes','mail_messages','mail_drafts','mail_conversation_mailboxes','mail_attachments','research_documents']}
 for uid in ['lead','first','second']:
  data['users'].append(dict(id=uid,email=uid+'@example.test',name=uid,password_hash='fixture-hash',active=True,created_at=NOW,updated_at=NOW))
  data['memberships'].append(dict(workspace_id='w',user_id=uid,role='founder' if uid=='lead' else 'ic',joined_at=NOW))
 data['workspaces']=[dict(id='w',name='Test team',created_at=NOW,updated_at=NOW)]
 data['accounts']=[dict(id='a',workspace_id='w',name='Example',owner_id='first',status='research',created_at=NOW,updated_at=NOW)]
 data['contacts']=[dict(id=cid,workspace_id='w',account_id='a',owner_id='first',first_name=cid,status='identified',created_at=NOW,updated_at=NOW) for cid in ['c1','c2']]
 data['mailboxes']=[dict(id='mail',workspace_id='w',email='first@example.test',kind='private',owner_id='first',created_at=NOW,updated_at=NOW)]
 data['research_documents']=[dict(id='doc',workspace_id='w',title='Research',content='x'*40000,created_at=NOW,updated_at=NOW)]
 return dict(timestamp=NOW,data=data)
class ImportTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  for migration in sorted((ROOT/'migrations').glob('*.sql')):self.db.executescript(migration.read_text())
 def apply(self,snapshot):self.db.executescript('\n'.join(importer.build(snapshot)[0]))
 def test_repeated_import_and_no_email(self):
  snapshot=fixture();self.apply(snapshot);self.apply(snapshot)
  self.assertEqual(self.db.execute("SELECT COUNT(*) FROM contacts WHERE email=''").fetchone()[0],2)
  self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],0)
 def test_private_mail_replaces_acl(self):
  snapshot=fixture();self.apply(snapshot)
  query="SELECT user_id FROM legacy_record_access WHERE record_id='orbit:mailboxes:mail'"
  self.assertEqual(self.db.execute(query).fetchall(),[('orbit:users:first',)])
  snapshot['data']['mailboxes'][0]['owner_id']='second';self.apply(snapshot)
  self.assertEqual(self.db.execute(query).fetchall(),[('orbit:users:second',)])
 def test_shrinking_payload_clears_old_chunks(self):
  snapshot=fixture();self.apply(snapshot);self.assertEqual(self.db.execute('SELECT COUNT(*) FROM legacy_record_chunks').fetchone()[0],3)
  snapshot['data']['research_documents'][0]['content']='short';self.apply(snapshot)
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM legacy_record_chunks').fetchone()[0],0)
 def test_newer_destination_password_and_account_survive(self):
  snapshot=fixture();self.apply(snapshot)
  self.db.execute("UPDATE users SET password_hash='upgraded',updated_at='2026-02-01' WHERE id='orbit:users:first'")
  self.db.execute("UPDATE accounts SET name='Edited',updated_at='2026-02-01' WHERE id='orbit:accounts:a'");self.db.commit();self.apply(snapshot)
  self.assertEqual(self.db.execute("SELECT password_hash FROM users WHERE id='orbit:users:first'").fetchone()[0],'upgraded')
  self.assertEqual(self.db.execute("SELECT name FROM accounts WHERE id='orbit:accounts:a'").fetchone()[0],'Edited')
if __name__=='__main__':unittest.main()
