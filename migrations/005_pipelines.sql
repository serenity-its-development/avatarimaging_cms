-- Pipelines: Customizable pipeline definitions
-- This allows fully customizable pipelines with custom names and stages

CREATE TABLE IF NOT EXISTS pipelines (
  id TEXT PRIMARY KEY,                    -- Format: pipeline_{ulid}
  name TEXT NOT NULL,                     -- e.g., "Lead to Booking", "Post-Appointment", "Partnership"
  description TEXT,                       -- Optional description
  color TEXT,                             -- Hex color for UI (e.g., "#3B82F6")

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,       -- Only one pipeline can be default

  -- Display
  display_order INTEGER DEFAULT 0,        -- For sorting in UI

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Pipeline Stages: Stages within each pipeline
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,                    -- Format: stage_{ulid}
  pipeline_id TEXT NOT NULL,              -- Which pipeline this stage belongs to

  name TEXT NOT NULL,                     -- e.g., "New Lead", "Contacted", "Qualified"
  key TEXT NOT NULL,                      -- Unique key within pipeline: "new_lead", "contacted", etc.
  description TEXT,
  color TEXT,                             -- Hex color for UI (e.g., "#10B981")

  -- Display
  display_order INTEGER NOT NULL,         -- Order of stages in pipeline (0, 1, 2, etc.)

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  UNIQUE(pipeline_id, key)                -- Key must be unique within pipeline
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipelines_active ON pipelines(is_active);
CREATE INDEX IF NOT EXISTS idx_pipelines_default ON pipelines(is_default);
CREATE INDEX IF NOT EXISTS idx_pipelines_order ON pipelines(display_order);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, display_order);

-- =====================================================================
-- SEED DATA: Default Pipelines
-- =====================================================================

-- Lead to Booking Pipeline
INSERT INTO pipelines (id, name, description, color, is_active, is_default, display_order, created_at, updated_at)
VALUES (
  'lead_to_booking',
  'Lead to Booking',
  'Track new leads from first contact through to booking confirmation',
  '#3B82F6',
  TRUE,
  TRUE,
  0,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Lead to Booking Stages
INSERT INTO pipeline_stages (id, pipeline_id, name, key, description, color, display_order, created_at, updated_at)
VALUES
  ('stage_ltb_new', 'lead_to_booking', 'New Lead', 'new_lead', 'Initial contact received', '#8B5CF6', 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_ltb_contacted', 'lead_to_booking', 'Contacted', 'contacted', 'Follow-up contact made', '#3B82F6', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_ltb_qualified', 'lead_to_booking', 'Qualified', 'qualified', 'Lead is qualified and interested', '#14B8A6', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_ltb_booked', 'lead_to_booking', 'Booked', 'booked', 'Appointment scheduled', '#10B981', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_ltb_attended', 'lead_to_booking', 'Attended', 'attended', 'Appointment completed', '#6B7280', 4, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Pre-Appointment Pipeline
INSERT INTO pipelines (id, name, description, color, is_active, is_default, display_order, created_at, updated_at)
VALUES (
  'pre_appointment',
  'Pre-Appointment',
  'Manage confirmed bookings leading up to appointment',
  '#10B981',
  TRUE,
  FALSE,
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Pre-Appointment Stages
INSERT INTO pipeline_stages (id, pipeline_id, name, key, description, color, display_order, created_at, updated_at)
VALUES
  ('stage_pa_confirmed', 'pre_appointment', 'Confirmed', 'confirmed', 'Booking confirmed', '#3B82F6', 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_pa_reminded', 'pre_appointment', 'Reminded', 'reminded', 'Reminder sent', '#8B5CF6', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_pa_ready', 'pre_appointment', 'Ready', 'ready', 'Patient ready for appointment', '#10B981', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Post-Appointment Pipeline
INSERT INTO pipelines (id, name, description, color, is_active, is_default, display_order, created_at, updated_at)
VALUES (
  'post_appointment',
  'Post-Appointment',
  'Follow-up and ongoing patient care after appointment',
  '#F59E0B',
  TRUE,
  FALSE,
  2,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Post-Appointment Stages
INSERT INTO pipeline_stages (id, pipeline_id, name, key, description, color, display_order, created_at, updated_at)
VALUES
  ('stage_post_processing', 'post_appointment', 'Processing Results', 'processing', 'Results being processed', '#F59E0B', 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_post_results_ready', 'post_appointment', 'Results Ready', 'results_ready', 'Results available', '#3B82F6', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_post_followup_required', 'post_appointment', 'Follow-up Required', 'followup_required', 'Additional follow-up needed', '#EF4444', 2, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('stage_post_complete', 'post_appointment', 'Complete', 'complete', 'All follow-up complete', '#10B981', 3, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
