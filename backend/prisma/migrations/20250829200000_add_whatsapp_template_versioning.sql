-- Add versioning/history table for WhatsApp templates
CREATE TABLE IF NOT EXISTS "Whatsapp_Template_History" (
    id SERIAL PRIMARY KEY,
    templateId INTEGER NOT NULL REFERENCES "whatsapp_templates"(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    data JSONB NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- Add version field to Whatsapp_Template if not present
ALTER TABLE "whatsapp_templates" ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
