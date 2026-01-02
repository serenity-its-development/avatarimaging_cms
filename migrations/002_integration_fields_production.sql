-- Migration 002: Add integration fields (production)
-- Adds ManyChat and provider-specific fields

-- Add ManyChat fields to contacts
ALTER TABLE contacts ADD COLUMN manychat_subscriber_id TEXT;
ALTER TABLE contacts ADD COLUMN manychat_tags TEXT;
ALTER TABLE contacts ADD COLUMN instagram_handle TEXT;
ALTER TABLE contacts ADD COLUMN facebook_id TEXT;

-- Add cost tracking for SMS (cost_aud only - provider and tenant_id already exist)
ALTER TABLE sms_messages ADD COLUMN cost_aud REAL;

-- Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_contacts_manychat_subscriber ON contacts(manychat_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider_message_id ON sms_messages(provider_message_id);
