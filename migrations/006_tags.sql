-- Tags: Flexible tagging system for contacts
-- AI can generate tags based on demographic info, behavior, etc.

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,                    -- Format: tag_{ulid}
  name TEXT NOT NULL,                     -- Tag name: "High Value", "Senior", "Urgent", etc.
  slug TEXT NOT NULL UNIQUE,              -- URL-safe slug: "high-value", "senior", "urgent"
  description TEXT,                       -- Optional description
  color TEXT,                             -- Hex color for UI (e.g., "#EF4444")
  category TEXT,                          -- Category: demographic, behavioral, priority, medical, custom

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,          -- How many contacts have this tag

  -- AI generation
  is_ai_generated BOOLEAN DEFAULT FALSE,  -- Was this tag created by AI?
  ai_reasoning TEXT,                      -- Why did AI create this tag?

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Contact Tags: Many-to-many relationship
CREATE TABLE IF NOT EXISTS contact_tags (
  id TEXT PRIMARY KEY,                    -- Format: ct_{ulid}
  contact_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,

  -- Metadata
  added_by TEXT,                          -- Who/what added this tag (staff_id, "ai", "system")
  confidence REAL,                        -- AI confidence score (0.0-1.0) if AI-generated

  -- Timestamps
  created_at INTEGER NOT NULL,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(contact_id, tag_id)              -- Can't tag same contact twice with same tag
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);

-- =====================================================================
-- SEED DATA: Common Tags
-- =====================================================================

-- Demographic tags
INSERT INTO tags (id, name, slug, description, color, category, is_active, created_at, updated_at)
VALUES
  ('tag_senior', 'Senior (65+)', 'senior', 'Patient aged 65 or older', '#9CA3AF', 'demographic', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_adult', 'Adult (18-64)', 'adult', 'Patient aged 18-64', '#6B7280', 'demographic', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_young_adult', 'Young Adult (18-35)', 'young-adult', 'Patient aged 18-35', '#3B82F6', 'demographic', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Priority tags
INSERT INTO tags (id, name, slug, description, color, category, is_active, created_at, updated_at)
VALUES
  ('tag_vip', 'VIP', 'vip', 'High-value or VIP patient', '#FCD34D', 'priority', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_urgent', 'Urgent', 'urgent', 'Requires immediate attention', '#EF4444', 'priority', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_follow_up', 'Follow-up Required', 'follow-up-required', 'Needs follow-up contact', '#F59E0B', 'priority', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Behavioral tags
INSERT INTO tags (id, name, slug, description, color, category, is_active, created_at, updated_at)
VALUES
  ('tag_first_time', 'First Time Patient', 'first-time', 'Never had appointment before', '#8B5CF6', 'behavioral', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_returning', 'Returning Patient', 'returning', 'Has had previous appointments', '#10B981', 'behavioral', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_no_show_risk', 'No-Show Risk', 'no-show-risk', 'History of missed appointments', '#DC2626', 'behavioral', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_highly_engaged', 'Highly Engaged', 'highly-engaged', 'Responsive and engaged patient', '#059669', 'behavioral', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Medical/Service tags
INSERT INTO tags (id, name, slug, description, color, category, is_active, created_at, updated_at)
VALUES
  ('tag_breast_screening', 'Breast Screening', 'breast-screening', 'Interested in breast screening', '#EC4899', 'medical', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_ct_scan', 'CT Scan', 'ct-scan', 'Interested in CT scan', '#14B8A6', 'medical', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_ultrasound', 'Ultrasound', 'ultrasound', 'Interested in ultrasound', '#06B6D4', 'medical', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_high_risk', 'High Risk', 'high-risk', 'High-risk patient requiring special attention', '#DC2626', 'medical', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Source/Channel tags
INSERT INTO tags (id, name, slug, description, color, category, is_active, created_at, updated_at)
VALUES
  ('tag_instagram', 'Instagram Lead', 'instagram', 'Came from Instagram', '#E1306C', 'channel', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_facebook', 'Facebook Lead', 'facebook', 'Came from Facebook', '#1877F2', 'channel', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_referral', 'Referral', 'referral', 'Referred by existing patient', '#10B981', 'channel', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('tag_website', 'Website', 'website', 'Came from website form', '#6366F1', 'channel', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
