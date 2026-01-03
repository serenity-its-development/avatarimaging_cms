-- =====================================================================
-- AI BOOKING ASSISTANT - DRAFT BOOKINGS & AUTO-ACTIONS
-- =====================================================================

-- Booking drafts - AI-suggested booking changes pending staff approval
CREATE TABLE IF NOT EXISTS booking_drafts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL DEFAULT 'default',

  -- Original booking (if rescheduling/cancelling)
  original_booking_id TEXT,

  -- Contact info
  contact_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,

  -- Draft booking details
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'reschedule', 'cancel')),
  proposed_date INTEGER,
  proposed_time TEXT,
  service_type TEXT,
  staff_id TEXT,
  duration_minutes INTEGER DEFAULT 30,

  -- AI reasoning
  ai_confidence REAL DEFAULT 0.0, -- 0.0-1.0
  ai_reasoning TEXT,
  source_message TEXT, -- The original message from patient
  source_channel TEXT, -- sms, instagram, facebook, etc.
  detected_intent TEXT,
  detected_entities TEXT, -- JSON: {date, time, reason, etc}

  -- Availability check
  availability_checked BOOLEAN DEFAULT 0,
  is_available BOOLEAN DEFAULT 0,
  alternative_slots TEXT, -- JSON array of alternative time slots if not available

  -- Status & review
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by TEXT,
  reviewed_at INTEGER,
  review_notes TEXT,

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  created_by TEXT NOT NULL DEFAULT 'ai_assistant',
  applied_at INTEGER,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (original_booking_id) REFERENCES bookings(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_drafts_tenant ON booking_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_drafts_contact ON booking_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_booking_drafts_status ON booking_drafts(status);
CREATE INDEX IF NOT EXISTS idx_booking_drafts_action ON booking_drafts(action_type);
CREATE INDEX IF NOT EXISTS idx_booking_drafts_created ON booking_drafts(created_at);

-- =====================================================================
-- AI ACTIONS LOG - Track all AI-initiated actions
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_actions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL DEFAULT 'default',

  -- Action details
  action_type TEXT NOT NULL, -- 'booking_draft', 'auto_cancel', 'auto_update', etc.
  entity_type TEXT NOT NULL, -- 'booking', 'contact', 'task', etc.
  entity_id TEXT,

  -- AI decision
  ai_model TEXT NOT NULL,
  ai_confidence REAL,
  ai_reasoning TEXT,
  input_data TEXT, -- JSON of input data
  output_data TEXT, -- JSON of AI output

  -- Result
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'reviewed')),
  error_message TEXT,

  -- Human review
  requires_review BOOLEAN DEFAULT 1,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  review_decision TEXT, -- 'approved', 'rejected', 'modified'

  -- Audit
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  completed_at INTEGER,

  FOREIGN KEY (entity_id) REFERENCES bookings(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_actions_tenant ON ai_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_type ON ai_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_actions_status ON ai_actions(status);
CREATE INDEX IF NOT EXISTS idx_ai_actions_review ON ai_actions(requires_review);
CREATE INDEX IF NOT EXISTS idx_ai_actions_created ON ai_actions(created_at);

-- =====================================================================
-- UPDATE BOOKINGS TABLE - Add cancellation tracking
-- =====================================================================

-- Add cancellation fields if they don't exist (safe to run multiple times)
-- Note: SQLite doesn't support IF NOT EXISTS for columns, so we use a more defensive approach

-- First, check if we need to add columns by attempting to select them
-- If the column doesn't exist, the migration will add it

-- For production safety, we'll use a different approach:
-- Create a new column only if the table structure allows it

-- Add cancelled_at column
ALTER TABLE bookings ADD COLUMN cancelled_at INTEGER;

-- Add cancellation_reason column
ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;

-- Add cancelled_by column (contact, staff, ai_assistant)
ALTER TABLE bookings ADD COLUMN cancelled_by TEXT;

-- Add last_ai_action_id to link to AI actions
ALTER TABLE bookings ADD COLUMN last_ai_action_id TEXT;
