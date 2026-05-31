ALTER TABLE email_templates ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE email_templates ADD COLUMN approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE email_templates ADD COLUMN approved_at TEXT;

UPDATE email_templates
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = '';
