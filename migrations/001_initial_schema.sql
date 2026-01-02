-- Avatar Imaging CRM - Initial Database Schema
-- Platform: Cloudflare D1 (SQLite)
-- Created: 2026-01-02
-- Version: 1.0.0

-- =====================================================================
-- CORE ENTITIES
-- =====================================================================

-- Contacts: Central entity tracking all leads and patients
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,                    -- Format: contact_{ulid}
  name TEXT NOT NULL,
  phone TEXT NOT NULL,                    -- E.164 format: +61400000000
  email TEXT,

  -- Attribution & Pipeline
  source TEXT NOT NULL,                   -- First-touch attribution: wix_form, manychat, meta_ad, referral, etc.
  current_pipeline TEXT NOT NULL,         -- lead_to_booking, pre_appointment, post_appointment, partnership
  current_stage TEXT NOT NULL,            -- Stage within pipeline (e.g., "new_lead", "appointment_confirmed")

  -- Warmness Scoring
  warmness_score INTEGER DEFAULT 0,       -- Calculated score 0-100
  warmness_reasoning TEXT,                -- AI-generated reasoning (optional)
  warmness_updated_at INTEGER,            -- Last warmness calculation timestamp

  -- Patient Status
  is_existing_patient BOOLEAN DEFAULT FALSE,

  -- Custom Fields (JSON)
  data TEXT DEFAULT '{}',                 -- JSON: { intent, age, location, referrer_name, etc. }

  -- Timestamps
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,

  UNIQUE(phone)                           -- Phone is unique identifier
);

-- Bookings: Wix Bookings integration
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,                    -- Format: booking_{ulid}
  contact_id TEXT NOT NULL,

  -- Wix Integration
  wix_booking_id TEXT UNIQUE,             -- External Wix ID

  -- Booking Details
  service_name TEXT NOT NULL,             -- e.g., "Breast Screening", "CT Scan"
  location TEXT NOT NULL,                 -- Clinic location
  appointment_datetime INTEGER NOT NULL,  -- Unix timestamp
  status TEXT NOT NULL,                   -- pending, confirmed, completed, cancelled, no_show

  -- Staff Assignment
  assigned_staff_id TEXT,                 -- Foreign key to staff_users.id

  -- Notes
  notes TEXT,                             -- Staff notes

  -- Custom Fields (JSON)
  data TEXT DEFAULT '{}',                 -- JSON: { parking_info, special_requests, etc. }

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,                   -- When appointment actually occurred

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_staff_id) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Tasks: Staff workflow management
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                    -- Format: task_{ulid}
  contact_id TEXT NOT NULL,
  booking_id TEXT,                        -- Optional: task may relate to specific booking

  -- Task Details
  title TEXT NOT NULL,                    -- e.g., "Call Jane - High Risk Spot Concern"
  description TEXT,
  task_type TEXT NOT NULL,                -- call, sms, email, admin, follow_up
  priority TEXT NOT NULL DEFAULT 'medium', -- urgent, high, medium, low
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled

  -- Assignment
  assigned_to TEXT,                       -- Staff user ID

  -- Scheduling
  due_date INTEGER,                       -- Unix timestamp
  completed_at INTEGER,

  -- Context
  context TEXT DEFAULT '{}',              -- JSON: { trigger, automation_rule_id, warmness_at_creation, etc. }

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- Touchpoints: Multi-touch attribution tracking
CREATE TABLE touchpoints (
  id TEXT PRIMARY KEY,                    -- Format: touchpoint_{ulid}
  contact_id TEXT NOT NULL,

  -- Touchpoint Details
  type TEXT NOT NULL,                     -- sms_sent, sms_received, email_sent, email_opened, booking_created, call_made, etc.
  channel TEXT NOT NULL,                  -- sms, email, phone, web, manychat
  direction TEXT NOT NULL,                -- inbound, outbound, system

  -- Content
  summary TEXT,                           -- Brief summary (e.g., "Reminder sent: 24hr before appointment")
  details TEXT,                           -- Full details (JSON or text)

  -- Attribution
  campaign_id TEXT,                       -- Optional: marketing campaign ID

  -- Timestamps
  created_at INTEGER NOT NULL,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- SMS Messages: Complete SMS communication log
CREATE TABLE sms_messages (
  id TEXT PRIMARY KEY,                    -- Format: sms_{ulid}
  contact_id TEXT NOT NULL,

  -- Message Details
  direction TEXT NOT NULL,                -- inbound, outbound
  message_body TEXT NOT NULL,

  -- Provider Integration
  provider TEXT NOT NULL,                 -- clicksend, messagemedia
  provider_message_id TEXT UNIQUE,        -- External provider message ID

  -- Status Tracking
  status TEXT NOT NULL,                   -- queued, sent, delivered, failed, received
  error_message TEXT,                     -- If failed

  -- AI Intelligence
  detected_intent TEXT,                   -- AI-detected intent: confirm, cancel, reschedule, question, unknown
  intent_confidence REAL,                 -- 0.0 to 1.0

  -- Costs
  cost_cents INTEGER,                     -- Cost in cents (e.g., 4 = $0.04)

  -- Context
  automation_rule_id TEXT,                -- Which rule triggered this (if automated)
  task_id TEXT,                           -- Related task (if any)

  -- Timestamps
  created_at INTEGER NOT NULL,
  delivered_at INTEGER,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- =====================================================================
-- STAFF & USERS
-- =====================================================================

-- Staff Users: Portal authentication and permissions
CREATE TABLE staff_users (
  id TEXT PRIMARY KEY,                    -- Format: staff_{ulid}
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  -- Authentication
  google_id TEXT UNIQUE,                  -- Google OAuth ID

  -- Permissions
  role TEXT NOT NULL DEFAULT 'staff',     -- admin, manager, staff, readonly
  permissions TEXT DEFAULT '[]',          -- JSON array of permission strings

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- =====================================================================
-- AUTOMATION & CONFIGURATION
-- =====================================================================

-- Automation Rules: Pipeline automation configuration
CREATE TABLE automation_rules (
  id TEXT PRIMARY KEY,                    -- Format: rule_{ulid}

  -- Rule Identification
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger Configuration
  trigger_type TEXT NOT NULL,             -- event, time_based, condition_met
  trigger_config TEXT NOT NULL,           -- JSON: { event: 'booking_created', conditions: [...] }

  -- Pipeline Context
  pipeline TEXT,                          -- Which pipeline this applies to (null = all)
  stage TEXT,                             -- Which stage (null = all stages)

  -- Action Configuration
  action_type TEXT NOT NULL,              -- send_sms, create_task, update_field, move_stage
  action_config TEXT NOT NULL,            -- JSON: { template_id, delay_minutes, task_type, etc. }

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- SMS Templates: Reusable message templates
CREATE TABLE sms_templates (
  id TEXT PRIMARY KEY,                    -- Format: template_{ulid}

  -- Template Details
  name TEXT NOT NULL,
  category TEXT NOT NULL,                 -- confirmation, reminder, follow_up, recall, etc.
  message_template TEXT NOT NULL,         -- Template with variables: "Hi {{name}}, your appointment..."

  -- Variables
  required_variables TEXT DEFAULT '[]',   -- JSON array: ["name", "appointment_time", "location"]

  -- Usage
  usage_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- =====================================================================
-- AUDIT & LOGGING
-- =====================================================================

-- Event Log: Complete system audit trail
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,                    -- Format: event_{ulid}

  -- Event Details
  event_type TEXT NOT NULL,               -- webhook_received, automation_executed, task_completed, etc.
  entity_type TEXT,                       -- contact, booking, task, etc.
  entity_id TEXT,                         -- ID of affected entity

  -- Actor
  actor_type TEXT,                        -- system, staff, webhook, automation
  actor_id TEXT,                          -- Staff ID or system identifier

  -- Event Data
  summary TEXT,                           -- Human-readable summary
  details TEXT,                           -- Full JSON payload

  -- Result
  status TEXT NOT NULL,                   -- success, failure, partial
  error_message TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Contacts indexes
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_pipeline_stage ON contacts(current_pipeline, current_stage);
CREATE INDEX idx_contacts_warmness ON contacts(warmness_score DESC);
CREATE INDEX idx_contacts_created ON contacts(created_at DESC);

-- Bookings indexes
CREATE INDEX idx_bookings_contact ON bookings(contact_id);
CREATE INDEX idx_bookings_datetime ON bookings(appointment_datetime);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_wix ON bookings(wix_booking_id);
CREATE INDEX idx_bookings_assigned_staff ON bookings(assigned_staff_id);

-- Tasks indexes
CREATE INDEX idx_tasks_contact ON tasks(contact_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_type ON tasks(task_type);

-- Touchpoints indexes
CREATE INDEX idx_touchpoints_contact ON touchpoints(contact_id);
CREATE INDEX idx_touchpoints_type ON touchpoints(type);
CREATE INDEX idx_touchpoints_created ON touchpoints(created_at DESC);

-- SMS Messages indexes
CREATE INDEX idx_sms_contact ON sms_messages(contact_id);
CREATE INDEX idx_sms_direction ON sms_messages(direction);
CREATE INDEX idx_sms_status ON sms_messages(status);
CREATE INDEX idx_sms_provider_id ON sms_messages(provider_message_id);
CREATE INDEX idx_sms_created ON sms_messages(created_at DESC);

-- Staff Users indexes
CREATE INDEX idx_staff_email ON staff_users(email);
CREATE INDEX idx_staff_active ON staff_users(is_active);

-- Automation Rules indexes
CREATE INDEX idx_automation_active ON automation_rules(is_active);
CREATE INDEX idx_automation_trigger ON automation_rules(trigger_type);
CREATE INDEX idx_automation_pipeline ON automation_rules(pipeline);

-- Event Log indexes
CREATE INDEX idx_event_type ON event_log(event_type);
CREATE INDEX idx_event_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_event_created ON event_log(created_at DESC);

-- =====================================================================
-- SEED DATA: Default SMS Templates
-- =====================================================================

-- Confirmation templates
INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_confirm_booking', 'Booking Confirmation', 'confirmation',
   'Hi {{name}}, your {{service}} appointment is confirmed for {{datetime}} at {{location}}. Reply YES to confirm or call us on 1300 XXX XXX.',
   '["name", "service", "datetime", "location"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- Reminder templates
INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_reminder_24hr', '24hr Reminder', 'reminder',
   'Reminder: {{name}}, your {{service}} appointment is tomorrow at {{time}} at {{location}}. Reply YES to confirm.',
   '["name", "service", "time", "location"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_reminder_2hr', '2hr Reminder', 'reminder',
   'Hi {{name}}, your appointment is in 2 hours at {{location}}. See you soon!',
   '["name", "location"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- Follow-up templates
INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_post_appt_all_clear', 'Post-Appointment All Clear', 'follow_up',
   'Hi {{name}}, great news - your {{service}} results are all clear. No further action needed. Take care!',
   '["name", "service"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_post_appt_callback', 'Post-Appointment Callback Required', 'follow_up',
   'Hi {{name}}, please call us regarding your recent {{service}} on 1300 XXX XXX at your earliest convenience.',
   '["name", "service"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- Recall templates
INSERT INTO sms_templates (id, name, category, message_template, required_variables, created_at, updated_at)
VALUES
  ('template_recall_screening', 'Screening Recall', 'recall',
   'Hi {{name}}, it''s time for your {{months}}-month {{service}} check. Book online at {{booking_url}} or call 1300 XXX XXX.',
   '["name", "months", "service", "booking_url"]',
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Default Admin User
-- =====================================================================

INSERT INTO staff_users (id, email, name, google_id, role, permissions, is_active, created_at, updated_at)
VALUES
  ('staff_admin_default', 'admin@avatarimaging.com.au', 'System Administrator', NULL, 'admin',
   '["view_all", "edit_all", "delete_all", "manage_users", "manage_automation", "view_reports"]',
   TRUE,
   strftime('%s', 'now') * 1000,
   strftime('%s', 'now') * 1000);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
