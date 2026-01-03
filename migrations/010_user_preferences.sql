-- User Preferences Table
-- Stores per-user preferences for UI customization and behavior

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- UI Preferences
  theme TEXT DEFAULT 'light', -- light, dark, auto
  sidebar_collapsed INTEGER DEFAULT 0,
  default_view TEXT DEFAULT 'dashboard', -- default landing page

  -- AI Assistant Preferences
  ai_window_position TEXT, -- JSON: {x: number, y: number}
  ai_window_size TEXT, -- JSON: {width: number, height: number}
  ai_window_docked INTEGER DEFAULT 0, -- 0 = floating, 1 = docked
  ai_quick_access_enabled INTEGER DEFAULT 1,
  ai_auto_suggestions INTEGER DEFAULT 1,
  ai_temperature REAL DEFAULT 0.7,
  ai_context_length TEXT DEFAULT 'medium', -- short, medium, long

  -- Notifications Preferences
  desktop_notifications INTEGER DEFAULT 1,
  email_notifications INTEGER DEFAULT 1,
  sms_notifications INTEGER DEFAULT 0,
  notification_sound INTEGER DEFAULT 1,
  notification_types TEXT, -- JSON array of enabled notification types

  -- Dashboard Preferences
  dashboard_widgets TEXT, -- JSON array of widget configurations
  dashboard_layout TEXT DEFAULT 'grid', -- grid, list, compact

  -- Contact/Pipeline Preferences
  default_pipeline_id TEXT,
  default_contact_view TEXT DEFAULT 'card', -- card, table, kanban
  contacts_per_page INTEGER DEFAULT 25,
  show_archived_contacts INTEGER DEFAULT 0,

  -- Calendar Preferences
  calendar_view TEXT DEFAULT 'week', -- day, week, month, agenda
  calendar_start_time TEXT DEFAULT '08:00',
  calendar_end_time TEXT DEFAULT '18:00',
  calendar_slot_duration INTEGER DEFAULT 30, -- minutes
  calendar_show_weekends INTEGER DEFAULT 0,

  -- Messages Preferences
  message_preview INTEGER DEFAULT 1,
  message_group_by TEXT DEFAULT 'contact', -- contact, channel, date
  message_auto_archive INTEGER DEFAULT 0,

  -- Table/List Preferences
  visible_columns TEXT, -- JSON object: {contacts: [...], tasks: [...], etc}
  column_order TEXT, -- JSON object: {contacts: [...], tasks: [...], etc}
  sort_preferences TEXT, -- JSON object: {contacts: {field, direction}, etc}

  -- Keyboard Shortcuts
  keyboard_shortcuts_enabled INTEGER DEFAULT 1,
  custom_shortcuts TEXT, -- JSON object of custom keyboard shortcuts

  -- Language & Region
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Australia/Sydney',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24h', -- 12h, 24h
  currency TEXT DEFAULT 'AUD',

  -- Accessibility
  high_contrast INTEGER DEFAULT 0,
  reduce_motion INTEGER DEFAULT 0,
  text_size TEXT DEFAULT 'medium', -- small, medium, large, x-large
  screen_reader_mode INTEGER DEFAULT 0,

  -- Advanced
  debug_mode INTEGER DEFAULT 0,
  beta_features INTEGER DEFAULT 0,
  analytics_enabled INTEGER DEFAULT 1,

  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_synced_at INTEGER,

  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated ON user_preferences(updated_at);

-- Preference Change History (for audit/undo)
CREATE TABLE IF NOT EXISTS preference_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at INTEGER NOT NULL,
  changed_from TEXT, -- 'user', 'admin', 'system'

  FOREIGN KEY (tenant_id, user_id) REFERENCES user_preferences(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_preference_history_user ON preference_history(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_preference_history_changed ON preference_history(changed_at);

-- Insert default preferences for system user
INSERT OR IGNORE INTO user_preferences (
  id, tenant_id, user_id, created_at, updated_at
) VALUES (
  'pref_system_default',
  'default',
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
