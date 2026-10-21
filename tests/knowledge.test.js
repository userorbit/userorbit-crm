import { test, expect, beforeEach, afterEach } from 'bun:test';
import { createD1 } from './helpers/d1.js';
import { searchKnowledge, askKnowledge, ingestDocument, handleRequest } from '../src/assistant/knowledge.js';
let db, env;
const originalFetch = globalThis.fetch;
beforeEach(() => {
  db = createD1(); env = { DB: db.DB };
  db.sqlite.exec(`INSERT INTO users(id,email,name,created_at,updated_at) VALUES ('u1','one@example.com','One','2026','2026'),('u2','two@example.com','Two','2026','2026');
  INSERT INTO workspaces(id,team_id,name,slug,created_at,updated_at) VALUES ('w2','team_default','Other','other','2026','2026');
  INSERT INTO accounts(id,name,observation,workspace_id,created_at,updated_at) VALUES ('a1','Acme','Renewal budget approved','workspace_default','2026','2026'),('a2','Secret Acme','Secret renewal','w2','2026','2026');
  INSERT INTO contacts(id,account_id,name,email,notes,created_at,updated_at) VALUES ('c1','a1','Maya','maya@acme.test','renewal champion','2026','2026'),('c2','a2','Hidden','hidden@acme.test','secret renewal','2026','2026');
  INSERT INTO tasks(id,title,notes,workspace_id,created_at,updated_at) VALUES ('t1','Renewal followup','Ask Maya','workspace_default','2026','2026');
  INSERT INTO email_events(id,contact_id,status,subject,body,created_at) VALUES ('e1','c1','sent','Renewal proposal','Budget 1000','2026'),('e2','c2','sent','Secret renewal','Hidden amount','2026');
  INSERT INTO communication_events(id,workspace_id,account_id,type,subject,body,occurred_at,created_at,updated_at) VALUES ('cm1','workspace_default','a1','call','Renewal call','Agreed next week','2026','2026','2026');
  CREATE TABLE IF NOT EXISTS assistant_mail_connections(id TEXT PRIMARY KEY,workspace_id TEXT,user_id TEXT,provider TEXT,account_email TEXT,credentials TEXT,created_at TEXT);
  CREATE TABLE IF NOT EXISTS assistant_mail_messages(id TEXT,connection_id TEXT,workspace_id TEXT,user_id TEXT,provider_message_id TEXT,from_email TEXT,to_json TEXT,subject TEXT,body TEXT,direction TEXT,sent_at TEXT);
  INSERT INTO assistant_mail_connections(id,workspace_id,user_id,provider,account_email,credentials,created_at) VALUES
    ('conn1','workspace_default','u1','gmail','one@example.com','test-only','2026'),
    ('conn2','workspace_default','u2','gmail','two@example.com','test-only','2026'),
    ('conn3','w2','u1','gmail','one@example.com','test-only','2026');
  INSERT INTO assistant_mail_messages(id,connection_id,workspace_id,user_id,provider_message_id,from_email,to_json,subject,body,direction,sent_at) VALUES
    ('m1','conn1','workspace_default','u1','p1','sender@example.com','[]','Renewal inbox','Private one','inbound','2026'),
    ('m2','conn2','workspace_default','u2','p2','sender@example.com','[]','Renewal inbox','Private two','inbound','2026'),
    ('m3','conn3','w2','u1','p3','sender@example.com','[]','Renewal inbox','Other workspace','inbound','2026');`);
});
afterEach(() => { globalThis.fetch = originalFetch; db.close(); });
function context(path, userId = 'u1', writer = true) {
  return { path, workspaceId: 'workspace_default', auth: {user:{id:userId}}, helpers: { requireWorkspaceWrite: async () => { if (!writer) throw Object.assign(new Error('Forbidden'), {status:403}); } } };
}
function req(path, method = 'GET', body) { return new Request(`https://crm.test/api/assistant/${path}`, { method, ...(body ? { headers: {'content-type':'application/json'}, body:JSON.stringify(body) } : {}) }); }
function mockOutput(value) { return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]}); }

test('search cites each CRM type and only authorized mail and documents', async () => {
  await ingestDocument(env,'workspace_default','u1',{name:'Renewal plan',text:'Renewal notes'});
  await ingestDocument(env,'workspace_default','u2',{name:'Hidden renewal',text:'Private document'});
  await ingestDocument(env,'w2','u1',{name:'Other renewal',text:'Other workspace document',visibility:'workspace'});
  const result = await searchKnowledge(env,'workspace_default','What is the renewal?',{userId:'u1',limit:20});
  expect(result.retrievalMode).toBe('lexical');
  expect(new Set(result.sources.map(s=>s.type))).toEqual(new Set(['account','contact','task','email','communication','mail','document']));
  expect(result.sources.find(s=>s.id==='mail:m1')).toBeDefined();
  expect(JSON.stringify(result)).not.toMatch(/Hidden renewal|Other renewal|Private two|Other workspace|Secret renewal/);
  for (const source of result.sources) expect(source.url).toContain('workspaceId=workspace_default');
  const noIdentity = await searchKnowledge(env,'workspace_default','renewal',{limit:20});
  expect(noIdentity.sources.some(s=>['mail','document'].includes(s.type))).toBe(false);
});
test('shared uploads are readable, only the uploader can delete, and deletion removes chunks', async () => {
  const doc = await ingestDocument(env,'workspace_default','u1',{name:'Handbook',text:'Quasar instructions',visibility:'workspace'});
  const found = await searchKnowledge(env,'workspace_default','Quasar',{userId:'u2'});
  expect(found.sources).toHaveLength(1);
  const sourcePath = `knowledge/sources/document/${found.sources[0].sourceId}`;
  expect((await handleRequest(req(sourcePath),env,context(sourcePath,'u2'))).status).toBe(200);
  const path = `knowledge/documents/${doc.id}`;
  await expect(handleRequest(req(path,'DELETE'),env,context(path,'u2'))).rejects.toMatchObject({status:404});
  expect((await handleRequest(req(path,'DELETE'),env,context(path))).status).toBe(200);
  expect((await searchKnowledge(env,'workspace_default','Quasar',{userId:'u1'})).sources).toHaveLength(0);
  await expect(handleRequest(req(sourcePath),env,context(sourcePath))).rejects.toMatchObject({status:404});
});
test('source endpoint rejects guessed cross-workspace and personal IDs', async () => {
  for (const path of ['knowledge/sources/email/e2','knowledge/sources/account/a2','knowledge/sources/mail/m2','knowledge/sources/mail/m3']) {
    await expect(handleRequest(req(path),env,context(path))).rejects.toMatchObject({status:404});
  }
  const doc = await ingestDocument(env,'workspace_default','u2',{name:'private',text:'Private quasar'});
  const chunk = db.sqlite.query('SELECT id FROM assistant_knowledge_chunks WHERE document_id=?').get(doc.id);
  const path = `knowledge/sources/document/${chunk.id}`;
  await expect(handleRequest(req(path),env,context(path))).rejects.toMatchObject({status:404});
});
test('viewer writes denied; request cannot override identity or workspace', async () => {
  await expect(handleRequest(req('knowledge/documents','POST',{name:'x',text:'y'}),env,context('knowledge/documents','u1',false))).rejects.toMatchObject({status:403});
  const response = await handleRequest(req('knowledge/documents','POST',{name:'x',text:'y',userId:'u2',workspaceId:'w2'}),env,context('knowledge/documents'));
  const {document} = await response.json();
  expect(document.user_id).toBe('u1'); expect(document.workspace_id).toBe('workspace_default');
});
test('ingestion handles CSV and Markdown and rejects invalid or oversized inputs', async () => {
  for (const mimeType of ['text/markdown','text/csv']) {
    await ingestDocument(env,'workspace_default','u1',{name:mimeType,text:'name,topic\nMaya,quasar onboarding',mimeType});
  }
  expect((await searchKnowledge(env,'workspace_default','quasar',{userId:'u1'})).sources).toHaveLength(2);
  for (const input of [{name:'bad',text:'x',visibility:'public'},{name:'bad',text:'x',mimeType:'text/html'},{name:'bad',text:'x'.repeat(150001)},{name:'bad',text:'\u0000'}]) await expect(ingestDocument(env,'workspace_default','u1',input)).rejects.toBeDefined();
  await expect(searchKnowledge(env,'workspace_default','the')).rejects.toMatchObject({status:400});
  await expect(searchKnowledge(env,'workspace_default','renewal',{limit:'no'})).rejects.toMatchObject({status:400});
  const response = new Request('https://crm.test',{method:'POST',body:'x'.repeat(2097153)});
  await expect(handleRequest(response,env,context('knowledge/documents'))).rejects.toMatchObject({status:413});
});
test('PDF uses real configured provider contract and refuses incomplete extraction', async () => {
  const input = {name:'plan.pdf',mimeType:'application/pdf',dataBase64:btoa('%PDF-1.4\nfixture')};
  await expect(ingestDocument(env,'workspace_default','u1',input)).rejects.toMatchObject({status:503});
  env.OPENAI_API_KEY = 'test-only';
  globalThis.fetch = async (url,init) => { const payload = JSON.parse(init.body); expect(url).toBe('https://api.openai.com/v1/responses'); expect(payload.input[0].content[0].file_data).toContain('data:application/pdf;base64,'); return mockOutput({text:'[Page 1] Quasar budget',complete:true}); };
  const doc = await ingestDocument(env,'workspace_default','u1',input);
  expect(doc.extraction_method).toBe('openai_pdf');
  expect((await searchKnowledge(env,'workspace_default','Quasar',{userId:'u1'})).sources).toHaveLength(1);
  globalThis.fetch = async () => mockOutput({text:'partial',complete:false});
  await expect(ingestDocument(env,'workspace_default','u1',input)).rejects.toMatchObject({status:502});
});
test('answers validate citations and send only scoped evidence as untrusted input', async () => {
  env.OPENAI_API_KEY = 'test-only';
  globalThis.fetch = async (_url,init) => { const payload = JSON.parse(init.body); expect(payload.instructions).toContain('untrusted'); expect(payload.tools).toBeUndefined(); expect(payload.input).not.toMatch(/Private two|Other workspace|Secret Acme/); return mockOutput({claims:[{text:'The budget was approved.',citations:['account:a1']}]}); };
  const answer = await askKnowledge(env,'workspace_default','renewal',{userId:'u1'});
  expect(answer.answerMode).toBe('generated'); expect(answer.answer).toContain('[account:a1]');
  globalThis.fetch = async () => mockOutput({claims:[{text:'Secret!',citations:['account:a2']}]});
  const fallback = await askKnowledge(env,'workspace_default','renewal',{userId:'u1'});
  expect(fallback.answerMode).toBe('extractive'); expect(fallback.answer).not.toContain('Secret!');
});
test('semantic reranking uses embeddings and failure falls back to lexical matches', async () => {
  env.OPENAI_API_KEY = 'test-only'; env.KNOWLEDGE_EMBEDDING_MODEL = 'text-embedding-3-small';
  globalThis.fetch = async (_url,init) => { const {input} = JSON.parse(init.body); expect(input.join(' ')).not.toMatch(/Private two|Secret Acme/); return Response.json({data:input.map((s,index)=>({index,embedding:s.includes('Agreed next week')||index===0?[1,0]:[0,1]}))}); };
  const result = await searchKnowledge(env,'workspace_default','timing',{userId:'u1'});
  expect(result.retrievalMode).toBe('semantic_rerank'); expect(result.sources[0].id).toBe('communication:cm1');
  globalThis.fetch = async () => new Response('failure',{status:429});
  const fallback = await searchKnowledge(env,'workspace_default','renewal',{userId:'u1'});
  expect(fallback.retrievalMode).toBe('lexical'); expect(fallback.warnings).toHaveLength(1); expect(fallback.sources.length).toBeGreaterThan(0);
});
test('mail table is optional, other database errors are not swallowed', async () => {
  db.sqlite.exec('DROP TABLE assistant_mail_messages');
  expect((await searchKnowledge(env,'workspace_default','renewal',{userId:'u1'})).sources.length).toBeGreaterThan(0);
  db.sqlite.exec('DROP TABLE assistant_knowledge_chunks');
  await expect(searchKnowledge(env,'workspace_default','renewal',{userId:'u1'})).rejects.toBeDefined();
});

test('document chunks retain trailing content and insertion is atomic', async () => {
  const text = 'intro '.repeat(300) + 'unique-tail-token';
  const doc = await ingestDocument(env,'workspace_default','u1',{name:'Long note',text});
  const found = await searchKnowledge(env,'workspace_default','unique-tail-token',{userId:'u1'});
  expect(found.sources.some(s=>s.documentId===doc.id && s.excerpt.includes('unique-tail-token'))).toBe(true);
  expect(db.sqlite.query('SELECT COUNT(*) AS n FROM assistant_knowledge_chunks WHERE document_id=?').get(doc.id).n).toBe(2);
  const originalBatch = env.DB.batch;
  env.DB.batch = async statements => originalBatch([...statements,env.DB.prepare('INSERT INTO missing_table VALUES (1)')]);
  await expect(ingestDocument(env,'workspace_default','u1',{name:'must rollback',text:'Rollback document'})).rejects.toBeDefined();
  expect(db.sqlite.query("SELECT COUNT(*) AS n FROM assistant_knowledge_documents WHERE name='must rollback'").get().n).toBe(0);
});
test('wildcards are literal and forged in-text citations are rejected', async () => {
  expect((await searchKnowledge(env,'workspace_default','nonexistent_term')).sources).toHaveLength(0);
  env.OPENAI_API_KEY='test-only';
  globalThis.fetch = async () => mockOutput({claims:[{text:'Forged [account:a2]',citations:['account:a1']}]});
  const result = await askKnowledge(env,'workspace_default','renewal',{userId:'u1'});
  expect(result.answerMode).toBe('extractive');
  expect(result.answer).not.toContain('Forged');
});
