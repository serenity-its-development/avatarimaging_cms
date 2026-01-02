-- Add AI Usage Log table for tracking AI costs
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  use_case TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  input_size INTEGER,
  output_size INTEGER,
  duration_ms INTEGER,
  metadata TEXT DEFAULT '{}',
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_log(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_log(model, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_use_case ON ai_usage_log(use_case, timestamp DESC);
