-- Avatar Imaging CRM - Enterprise Features Migration
-- Platform: Cloudflare D1 (SQLite)
-- Created: 2026-01-02
-- Version: 2.0.0
-- Features: Multi-location, RBAC, IP Whitelist, Email Marketing, HIPAA Audit

-- =====================================================================
-- MULTI-LOCATION SUPPORT
-- =====================================================================

CREATE TABLE locations (
  id TEXT PRIMARY KEY,                    -- Format: location_{ulid}
  name TEXT NOT NULL,                     -- "Avatar Imaging Sydney"
  code TEXT UNIQUE NOT NULL,              -- "sydney", "melbourne", "brisbane"
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'AU',
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',

  -- Contact Info
  phone TEXT,
  email TEXT,

  -- Settings (JSON)
  settings TEXT DEFAULT '{}',             -- { booking_buffer_minutes, operating_hours, etc. }

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Add tenant_id to existing tables
ALTER TABLE contacts ADD COLUMN tenant_id TEXT REFERENCES locations(id);
ALTER TABLE bookings ADD COLUMN tenant_id TEXT REFERENCES locations(id);
ALTER TABLE tasks ADD COLUMN tenant_id TEXT REFERENCES locations(id);
ALTER TABLE sms_messages ADD COLUMN tenant_id TEXT REFERENCES locations(id);
ALTER TABLE staff_users ADD COLUMN default_location_id TEXT REFERENCES locations(id);

-- Indexes for tenant isolation
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_sms_tenant ON sms_messages(tenant_id);

-- =====================================================================
-- RBAC (Role-Based Access Control)
-- =====================================================================

-- Permission definitions (what roles can do)
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,                    -- Format: perm_{ulid}
  role TEXT NOT NULL,                     -- 'admin', 'doctor', 'receptionist', 'readonly'
  resource TEXT NOT NULL,                 -- 'contacts', 'bookings', 'reports', 'settings'
  action TEXT NOT NULL,                   -- 'create', 'read', 'update', 'delete', 'export'

  -- Conditions (JSON)
  conditions TEXT DEFAULT '{}',           -- { own_location_only: true, own_records_only: true }

  -- Metadata
  description TEXT,
  created_at INTEGER NOT NULL,

  UNIQUE(role, resource, action)
);

-- User-specific permissions (overrides + location assignments)
CREATE TABLE user_permissions (
  id TEXT PRIMARY KEY,                    -- Format: userperm_{ulid}
  user_id TEXT NOT NULL,
  location_id TEXT NOT NULL,

  -- Role at this location
  role TEXT NOT NULL,                     -- Can have different roles at different locations

  -- Custom permission overrides (JSON array)
  custom_permissions TEXT DEFAULT '[]',   -- [{ resource: 'reports', action: 'export', allow: true }]

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(user_id, location_id)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_location ON user_permissions(location_id);

-- =====================================================================
-- IP WHITELIST (IPv4 + IPv6)
-- =====================================================================

CREATE TABLE ip_whitelist (
  id TEXT PRIMARY KEY,                    -- Format: ipwl_{ulid}
  location_id TEXT,                       -- NULL = global (all locations)

  -- IP Address (CIDR notation)
  ip_address TEXT NOT NULL,               -- '203.0.113.0/24', '2001:db8::/32', '192.168.1.1'
  ip_version INTEGER NOT NULL,            -- 4 or 6

  -- Metadata
  description TEXT,                       -- "Office network", "Dr. Smith home"
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,               -- Staff user who added this
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE INDEX idx_ip_whitelist_location ON ip_whitelist(location_id);
CREATE INDEX idx_ip_whitelist_active ON ip_whitelist(is_active);

-- =====================================================================
-- EMAIL MARKETING AUTOMATION
-- =====================================================================

-- Email campaign definitions
CREATE TABLE email_campaigns (
  id TEXT PRIMARY KEY,                    -- Format: campaign_{ulid}
  tenant_id TEXT NOT NULL,

  -- Campaign Details
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,                -- Plain text fallback

  -- Audience (JSON filters)
  audience_filters TEXT NOT NULL,         -- { source: 'meta_ad', warmness: '>70', pipeline: 'post_appointment' }

  -- Scheduling
  status TEXT NOT NULL DEFAULT 'draft',   -- 'draft', 'scheduled', 'sending', 'completed', 'cancelled'
  scheduled_at INTEGER,
  sent_at INTEGER,

  -- Analytics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,

  -- AI-generated metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,                         -- Original AI prompt if generated

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE INDEX idx_email_campaigns_tenant ON email_campaigns(tenant_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at);

-- Email sends (individual emails sent as part of campaign)
CREATE TABLE email_sends (
  id TEXT PRIMARY KEY,                    -- Format: emailsend_{ulid}
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,

  -- Email Details
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'queued',  -- 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  error_message TEXT,

  -- Engagement Tracking
  sent_at INTEGER,
  delivered_at INTEGER,
  opened_at INTEGER,                      -- First open
  clicked_at INTEGER,                     -- First click
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,

  -- Gmail API
  gmail_message_id TEXT,                  -- Gmail message ID

  -- Timestamps
  created_at INTEGER NOT NULL,

  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX idx_email_sends_contact ON email_sends(contact_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);

-- Email templates (reusable)
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,                    -- Format: emailtpl_{ulid}
  tenant_id TEXT,                         -- NULL = global template

  -- Template Details
  name TEXT NOT NULL,
  category TEXT NOT NULL,                 -- 'welcome', 'recall', 'follow_up', 'marketing'
  subject_template TEXT NOT NULL,
  body_html_template TEXT NOT NULL,
  body_text_template TEXT NOT NULL,

  -- Variables
  required_variables TEXT DEFAULT '[]',   -- JSON: ["name", "appointment_date", "location"]

  -- Usage
  usage_count INTEGER DEFAULT 0,

  -- AI-generated
  ai_generated BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- =====================================================================
-- ADVANCED ANALYTICS & REPORTING
-- =====================================================================

-- Saved reports (AI-generated or custom)
CREATE TABLE saved_reports (
  id TEXT PRIMARY KEY,                    -- Format: report_{ulid}
  tenant_id TEXT NOT NULL,

  -- Report Definition
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,              -- 'warmness_trends', 'no_show_analysis', 'conversion_funnel', 'custom'

  -- Query Parameters (JSON)
  parameters TEXT NOT NULL,               -- { date_range, metrics, dimensions, filters }

  -- Schedule (optional)
  schedule TEXT,                          -- Cron expression: '0 9 * * 1' (every Monday 9am)
  last_run_at INTEGER,
  next_run_at INTEGER,

  -- Recipients
  email_recipients TEXT DEFAULT '[]',     -- JSON: ["admin@example.com"]

  -- AI Configuration
  include_ai_insights BOOLEAN DEFAULT TRUE,
  ai_focus TEXT,                          -- 'actionable_recommendations', 'trend_analysis', 'anomaly_detection'

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE INDEX idx_saved_reports_tenant ON saved_reports(tenant_id);
CREATE INDEX idx_saved_reports_schedule ON saved_reports(schedule, next_run_at);

-- Report runs (execution history)
CREATE TABLE report_runs (
  id TEXT PRIMARY KEY,                    -- Format: reportrun_{ulid}
  report_id TEXT NOT NULL,

  -- Execution
  status TEXT NOT NULL,                   -- 'running', 'completed', 'failed'
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,

  -- Results (stored for 90 days)
  result_summary TEXT,                    -- JSON: { total_contacts: 1234, conversion_rate: 0.45 }
  ai_insights TEXT,                       -- JSON: AI-generated insights
  chart_data TEXT,                        -- JSON: Chart configuration

  -- Error handling
  error_message TEXT,

  FOREIGN KEY (report_id) REFERENCES saved_reports(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_runs_report ON report_runs(report_id);
CREATE INDEX idx_report_runs_completed ON report_runs(completed_at DESC);

-- =====================================================================
-- HIPAA COMPLIANCE
-- =====================================================================

-- HIPAA Audit Log (immutable, append-only)
CREATE TABLE hipaa_audit_log (
  id TEXT PRIMARY KEY,                    -- Format: hipaa_{ulid}

  -- Who
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,               -- Denormalized for audit
  user_name TEXT NOT NULL,

  -- Where
  tenant_id TEXT NOT NULL,
  location_name TEXT NOT NULL,            -- Denormalized

  -- What
  action TEXT NOT NULL,                   -- 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'
  resource_type TEXT NOT NULL,            -- 'contact', 'booking', 'sms_message', 'report'
  resource_id TEXT,
  resource_summary TEXT,                  -- Brief description: "Contact: Jane Doe (+61400000000)"

  -- Request Details
  request_method TEXT NOT NULL,           -- 'GET', 'POST', 'PUT', 'DELETE'
  request_path TEXT NOT NULL,
  request_query TEXT,                     -- Query parameters
  request_body_hash TEXT,                 -- SHA256 hash of request body (for verification)

  -- Network
  ip_address TEXT NOT NULL,
  user_agent TEXT,

  -- Result
  status_code INTEGER NOT NULL,           -- HTTP status code
  duration_ms INTEGER NOT NULL,

  -- PHI Access Flag
  phi_accessed BOOLEAN DEFAULT FALSE,     -- Did this request access Protected Health Information?

  -- Timestamp (immutable)
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES staff_users(id),
  FOREIGN KEY (tenant_id) REFERENCES locations(id)
);

-- Indexes for HIPAA audit queries
CREATE INDEX idx_hipaa_timestamp ON hipaa_audit_log(timestamp DESC);
CREATE INDEX idx_hipaa_user ON hipaa_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_hipaa_tenant ON hipaa_audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_hipaa_resource ON hipaa_audit_log(resource_type, resource_id);
CREATE INDEX idx_hipaa_action ON hipaa_audit_log(action, timestamp DESC);
CREATE INDEX idx_hipaa_phi ON hipaa_audit_log(phi_accessed, timestamp DESC);

-- =====================================================================
-- AI USAGE TRACKING
-- =====================================================================

-- Track all AI model usage for cost analysis and optimization
CREATE TABLE ai_usage_log (
  id TEXT PRIMARY KEY,                    -- Format: aiusage_{ulid}
  tenant_id TEXT NOT NULL,

  -- Model Details
  model TEXT NOT NULL,                    -- '@cf/meta/llama-3.1-8b-instruct'
  use_case TEXT NOT NULL,                 -- 'warmness_scoring', 'sms_intent', 'report_generation'

  -- Request
  prompt_length INTEGER NOT NULL,         -- Characters
  max_tokens INTEGER NOT NULL,

  -- Response
  tokens_used INTEGER NOT NULL,
  response_length INTEGER NOT NULL,       -- Characters
  duration_ms INTEGER NOT NULL,

  -- Cost (calculated)
  cost_usd REAL NOT NULL,                 -- Actual cost in USD

  -- Context
  user_id TEXT,
  resource_type TEXT,                     -- 'contact', 'campaign', 'report'
  resource_id TEXT,

  -- Timestamp
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES locations(id),
  FOREIGN KEY (user_id) REFERENCES staff_users(id)
);

CREATE INDEX idx_ai_usage_tenant ON ai_usage_log(tenant_id, timestamp DESC);
CREATE INDEX idx_ai_usage_model ON ai_usage_log(model, timestamp DESC);
CREATE INDEX idx_ai_usage_use_case ON ai_usage_log(use_case, timestamp DESC);

-- =====================================================================
-- SEED DATA: Default Permissions
-- =====================================================================

-- Admin role (full access)
INSERT INTO permissions (id, role, resource, action, conditions, description, created_at)
VALUES
  ('perm_admin_contacts_all', 'admin', 'contacts', '*', '{}', 'Admin: Full contact access', strftime('%s', 'now') * 1000),
  ('perm_admin_bookings_all', 'admin', 'bookings', '*', '{}', 'Admin: Full booking access', strftime('%s', 'now') * 1000),
  ('perm_admin_tasks_all', 'admin', 'tasks', '*', '{}', 'Admin: Full task access', strftime('%s', 'now') * 1000),
  ('perm_admin_reports_all', 'admin', 'reports', '*', '{}', 'Admin: Full report access', strftime('%s', 'now') * 1000),
  ('perm_admin_settings_all', 'admin', 'settings', '*', '{}', 'Admin: Full settings access', strftime('%s', 'now') * 1000),
  ('perm_admin_users_all', 'admin', 'users', '*', '{}', 'Admin: Full user management', strftime('%s', 'now') * 1000);

-- Doctor role (read/update patients, read reports)
INSERT INTO permissions (id, role, resource, action, conditions, description, created_at)
VALUES
  ('perm_doctor_contacts_read', 'doctor', 'contacts', 'read', '{"own_location_only": true}', 'Doctor: View contacts at own location', strftime('%s', 'now') * 1000),
  ('perm_doctor_contacts_update', 'doctor', 'contacts', 'update', '{"own_location_only": true}', 'Doctor: Update contacts at own location', strftime('%s', 'now') * 1000),
  ('perm_doctor_bookings_read', 'doctor', 'bookings', 'read', '{"own_location_only": true}', 'Doctor: View bookings at own location', strftime('%s', 'now') * 1000),
  ('perm_doctor_bookings_update', 'doctor', 'bookings', 'update', '{"own_location_only": true}', 'Doctor: Update bookings at own location', strftime('%s', 'now') * 1000),
  ('perm_doctor_reports_read', 'doctor', 'reports', 'read', '{"own_location_only": true}', 'Doctor: View reports at own location', strftime('%s', 'now') * 1000);

-- Receptionist role (manage appointments, limited contact edit)
INSERT INTO permissions (id, role, resource, action, conditions, description, created_at)
VALUES
  ('perm_receptionist_contacts_read', 'receptionist', 'contacts', 'read', '{"own_location_only": true}', 'Receptionist: View contacts', strftime('%s', 'now') * 1000),
  ('perm_receptionist_contacts_create', 'receptionist', 'contacts', 'create', '{"own_location_only": true}', 'Receptionist: Create contacts', strftime('%s', 'now') * 1000),
  ('perm_receptionist_contacts_update', 'receptionist', 'contacts', 'update', '{"own_location_only": true}', 'Receptionist: Update contacts', strftime('%s', 'now') * 1000),
  ('perm_receptionist_bookings_all', 'receptionist', 'bookings', '*', '{"own_location_only": true}', 'Receptionist: Full booking access', strftime('%s', 'now') * 1000),
  ('perm_receptionist_tasks_all', 'receptionist', 'tasks', '*', '{"own_location_only": true}', 'Receptionist: Full task access', strftime('%s', 'now') * 1000),
  ('perm_receptionist_sms_send', 'receptionist', 'sms', 'send', '{"own_location_only": true}', 'Receptionist: Send SMS', strftime('%s', 'now') * 1000);

-- Readonly role (view only)
INSERT INTO permissions (id, role, resource, action, conditions, description, created_at)
VALUES
  ('perm_readonly_contacts_read', 'readonly', 'contacts', 'read', '{"own_location_only": true, "masked_phi": true}', 'Readonly: View contacts (masked PHI)', strftime('%s', 'now') * 1000),
  ('perm_readonly_bookings_read', 'readonly', 'bookings', 'read', '{"own_location_only": true}', 'Readonly: View bookings', strftime('%s', 'now') * 1000),
  ('perm_readonly_reports_read', 'readonly', 'reports', 'read', '{"own_location_only": true}', 'Readonly: View reports', strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Default Location (Avatar Imaging Sydney)
-- =====================================================================

INSERT INTO locations (id, name, code, address, city, state, postcode, country, timezone, phone, email, settings, is_active, created_at, updated_at)
VALUES (
  'location_avatar_sydney',
  'Avatar Imaging Sydney',
  'sydney',
  '123 Medical Street',
  'Sydney',
  'NSW',
  '2000',
  'AU',
  'Australia/Sydney',
  '+61 2 1234 5678',
  'sydney@avatarimaging.com.au',
  '{"booking_buffer_minutes": 15, "operating_hours": {"mon": "8:00-17:00", "tue": "8:00-17:00", "wed": "8:00-17:00", "thu": "8:00-17:00", "fri": "8:00-17:00"}}',
  TRUE,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- =====================================================================
-- SEED DATA: Default Email Templates
-- =====================================================================

INSERT INTO email_templates (id, tenant_id, name, category, subject_template, body_html_template, body_text_template, required_variables, is_active, created_at, updated_at)
VALUES
  ('emailtpl_welcome', NULL, 'Welcome Email', 'welcome',
   'Welcome to Avatar Imaging, {{name}}!',
   '<p>Hi {{name}},</p><p>Thank you for choosing Avatar Imaging. We look forward to seeing you at your appointment.</p>',
   'Hi {{name}},\n\nThank you for choosing Avatar Imaging. We look forward to seeing you at your appointment.',
   '["name"]',
   TRUE,
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000),

  ('emailtpl_recall', NULL, 'Screening Recall', 'recall',
   'Time for your {{months}}-month {{service}} check',
   '<p>Hi {{name}},</p><p>It''s been {{months}} months since your last {{service}}. Book your follow-up at {{booking_url}}.</p>',
   'Hi {{name}},\n\nIt''s been {{months}} months since your last {{service}}. Book your follow-up at {{booking_url}}.',
   '["name", "months", "service", "booking_url"]',
   TRUE,
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
