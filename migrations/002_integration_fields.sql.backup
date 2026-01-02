-- Migration 002: Add integration fields for MobileMessage and ManyChat
-- Date: 2026-01-02

-- =====================================================================
-- CONTACTS TABLE - Add integration fields
-- =====================================================================

-- ManyChat (Instagram/Facebook) fields
ALTER TABLE contacts
ADD COLUMN manychat_subscriber_id TEXT;

ALTER TABLE contacts
ADD COLUMN manychat_tags TEXT; -- JSON array of tags

ALTER TABLE contacts
ADD COLUMN instagram_handle TEXT;

ALTER TABLE contacts
ADD COLUMN facebook_id TEXT;

-- Create index for ManyChat lookups
CREATE INDEX IF NOT EXISTS idx_contacts_manychat_subscriber
ON contacts(manychat_subscriber_id);

-- =====================================================================
-- SMS_MESSAGES TABLE - Add provider field
-- =====================================================================

-- Track which SMS provider was used
ALTER TABLE sms_messages
ADD COLUMN provider TEXT DEFAULT 'clicksend'; -- 'clicksend' | 'mobilemessage' | 'sendgrid'

ALTER TABLE sms_messages
ADD COLUMN cost_aud REAL; -- Cost in Australian dollars (for MobileMessage)

-- Update provider_message_id index name to be more generic
CREATE INDEX IF NOT EXISTS idx_sms_provider_message_id
ON sms_messages(provider_message_id);

-- =====================================================================
-- TOUCHPOINTS TABLE - Add Instagram channel
-- =====================================================================

-- No schema change needed, but document new channel values:
-- channel can now be: 'phone', 'email', 'sms', 'instagram_dm', 'facebook_messenger', 'website'

-- =====================================================================
-- DATA MIGRATION
-- =====================================================================

-- Set default provider for existing SMS messages
UPDATE sms_messages
SET provider = 'clicksend'
WHERE provider IS NULL;

-- =====================================================================
-- NOTES
-- =====================================================================

-- ManyChat Integration:
-- - manychat_subscriber_id: Unique ID from ManyChat for this subscriber
-- - manychat_tags: JSON array of tags like ["lead", "interested-mri", "qualified"]
-- - instagram_handle: @username on Instagram (if available)
-- - facebook_id: Facebook user ID (if available)

-- MobileMessage Integration:
-- - provider: Set to 'mobilemessage' for messages sent via MobileMessage API
-- - cost_aud: Actual cost in AUD (typically $0.04-0.06 per SMS)
-- - provider_message_id: Message ID from MobileMessage for tracking

-- Usage Examples:

-- Find contact by ManyChat subscriber ID:
-- SELECT * FROM contacts WHERE manychat_subscriber_id = '123456789';

-- Get contacts with specific ManyChat tag:
-- SELECT * FROM contacts WHERE manychat_tags LIKE '%"interested-mri"%';

-- Calculate total SMS cost via MobileMessage:
-- SELECT SUM(cost_aud) FROM sms_messages WHERE provider = 'mobilemessage';

-- Get Instagram leads:
-- SELECT * FROM contacts WHERE source = 'manychat_instagram';
