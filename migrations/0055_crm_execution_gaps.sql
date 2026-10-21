ALTER TABLE accounts ADD COLUMN parent_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN qualification TEXT;
ALTER TABLE accounts ADD COLUMN evidence TEXT;
ALTER TABLE accounts ADD COLUMN next_action TEXT;
ALTER TABLE contacts ADD COLUMN buyer_role TEXT;
ALTER TABLE contacts ADD COLUMN relationship_status TEXT;
ALTER TABLE contacts ADD COLUMN source TEXT;
ALTER TABLE contacts ADD COLUMN evidence TEXT;
ALTER TABLE contacts ADD COLUMN next_action TEXT;
ALTER TABLE tasks ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent'));
ALTER TABLE tasks ADD COLUMN blocked_reason TEXT;
ALTER TABLE tasks ADD COLUMN definition_of_done TEXT;
CREATE TABLE outreach_suppressions (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('email','domain','linkedin')), value TEXT NOT NULL, reason TEXT,
 created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL,
 UNIQUE(workspace_id,kind,value)
);
CREATE INDEX idx_outreach_suppression_lookup ON outreach_suppressions(workspace_id,kind,value);
-- Restore structured source details already preserved in the read-only archive.
UPDATE accounts SET
 qualification=(SELECT json_extract(payload_json,'$.fit_summary') FROM legacy_records WHERE id=accounts.id AND json_valid(payload_json)),
 evidence=(SELECT json_extract(payload_json,'$.evidence_summary') FROM legacy_records WHERE id=accounts.id AND json_valid(payload_json)),
 next_action=(SELECT json_extract(payload_json,'$.next_action') FROM legacy_records WHERE id=accounts.id AND json_valid(payload_json))
WHERE id LIKE 'orbit:accounts:%';
UPDATE contacts SET
 buyer_role=(SELECT json_extract(payload_json,'$.buyer_role') FROM legacy_records WHERE id=contacts.id AND json_valid(payload_json)),
 relationship_status=(SELECT json_extract(payload_json,'$.relationship_status') FROM legacy_records WHERE id=contacts.id AND json_valid(payload_json)),
 source=(SELECT json_extract(payload_json,'$.source') FROM legacy_records WHERE id=contacts.id AND json_valid(payload_json)),
 next_action=(SELECT json_extract(payload_json,'$.next_action') FROM legacy_records WHERE id=contacts.id AND json_valid(payload_json))
WHERE id LIKE 'orbit:contacts:%';
UPDATE tasks SET
 blocked_reason=(SELECT json_extract(payload_json,'$.blocked_reason') FROM legacy_records WHERE id=tasks.id AND json_valid(payload_json)),
 definition_of_done=(SELECT json_extract(payload_json,'$.definition_of_done') FROM legacy_records WHERE id=tasks.id AND json_valid(payload_json)),
 owner_user_id=(SELECT u.id FROM legacy_records r JOIN users u ON u.id='orbit:users:'||json_extract(r.payload_json,'$.owner_id') WHERE r.id=tasks.id AND json_valid(r.payload_json)),
 priority=COALESCE((SELECT CASE lower(CAST(json_extract(payload_json,'$.priority') AS TEXT)) WHEN 'low' THEN 'low' WHEN 'high' THEN 'high' WHEN 'urgent' THEN 'urgent' ELSE 'normal' END FROM legacy_records WHERE id=tasks.id AND json_valid(payload_json)),'normal')
WHERE id LIKE 'orbit:work_items:%';
UPDATE accounts SET parent_account_id=(SELECT p.id FROM legacy_records r JOIN accounts p ON p.id='orbit:accounts:'||json_extract(r.payload_json,'$.parent_account_id') AND p.workspace_id=accounts.workspace_id WHERE r.id=accounts.id AND json_valid(r.payload_json) AND p.id<>accounts.id) WHERE id LIKE 'orbit:accounts:%';
INSERT OR IGNORE INTO outreach_suppressions(id,workspace_id,kind,value,reason,created_by_user_id,created_at)
SELECT r.id||':'||w.workspace_id,w.workspace_id,json_extract(r.payload_json,'$.kind'),lower(trim(json_extract(r.payload_json,'$.value'))),json_extract(r.payload_json,'$.reason'),NULL,r.created_at
FROM legacy_records r JOIN legacy_workspace_owners w ON w.source_workspace_id=r.workspace_id
WHERE r.source_table='crm_suppressions' AND json_valid(r.payload_json) AND json_extract(r.payload_json,'$.active')=1 AND json_extract(r.payload_json,'$.kind') IN ('email','domain') AND length(trim(json_extract(r.payload_json,'$.value')))>0;
CREATE TABLE crm_legacy_entity_links (
 entity TEXT NOT NULL CHECK(entity IN ('account','contact')), entity_id TEXT NOT NULL, legacy_entity_id TEXT NOT NULL,
 PRIMARY KEY(entity,entity_id,legacy_entity_id)
);
INSERT INTO crm_legacy_entity_links(entity,entity_id,legacy_entity_id) SELECT 'account',id,substr(id,16) FROM accounts WHERE id LIKE 'orbit:accounts:%';
INSERT INTO crm_legacy_entity_links(entity,entity_id,legacy_entity_id) SELECT 'contact',id,substr(id,16) FROM contacts WHERE id LIKE 'orbit:contacts:%';
UPDATE tasks SET status=(SELECT CASE json_extract(r.payload_json,'$.status') WHEN 'in_progress' THEN 'in_progress' WHEN 'blocked' THEN 'blocked' ELSE tasks.status END FROM legacy_records r WHERE r.id=tasks.id)
WHERE id LIKE 'orbit:work_items:%' AND EXISTS(SELECT 1 FROM legacy_records r WHERE r.id=tasks.id AND r.updated_at=tasks.updated_at AND json_valid(r.payload_json) AND json_extract(r.payload_json,'$.status') IN ('in_progress','blocked'));
