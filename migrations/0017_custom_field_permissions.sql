ALTER TABLE custom_fields ADD COLUMN read_roles_json TEXT;
ALTER TABLE custom_fields ADD COLUMN write_roles_json TEXT;

UPDATE custom_fields
SET
  read_roles_json = COALESCE(read_roles_json, '["owner","admin","member","viewer"]'),
  write_roles_json = COALESCE(write_roles_json, '["owner","admin","member"]');
