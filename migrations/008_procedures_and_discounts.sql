-- Migration 008: Procedures and Discount Codes Management
-- Creates tables for managing procedures/services with pricing and discount codes tied to influencers

-- =====================================================================
-- PROCEDURES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,                    -- e.g., "Skin Cancer Screening", "Medical Imaging"
  description TEXT,                      -- Full description of the procedure
  duration_minutes INTEGER NOT NULL,     -- How long the appointment takes
  base_price REAL NOT NULL,             -- Price in AUD (e.g., 150.00)
  category TEXT,                         -- Optional: "Screening", "Imaging", "Consultation"
  is_active INTEGER DEFAULT 1,           -- 1 = active, 0 = inactive
  requires_deposit INTEGER DEFAULT 0,    -- 1 = requires deposit, 0 = full payment
  deposit_amount REAL DEFAULT 0,         -- Deposit amount if required
  metadata TEXT,                         -- JSON for additional data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON procedures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procedures_active ON procedures(is_active);

-- =====================================================================
-- INFLUENCERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS influencers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,                    -- Influencer name
  email TEXT,                            -- Contact email
  phone TEXT,                            -- Contact phone
  platform TEXT,                         -- e.g., "Instagram", "TikTok", "YouTube"
  handle TEXT,                           -- Social media handle
  commission_rate REAL DEFAULT 0,        -- Commission % they earn (e.g., 10.00 for 10%)
  total_referrals INTEGER DEFAULT 0,     -- Count of referrals
  total_revenue REAL DEFAULT 0,          -- Total revenue generated
  is_active INTEGER DEFAULT 1,           -- 1 = active, 0 = inactive
  notes TEXT,                            -- Internal notes
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_influencers_tenant ON influencers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_influencers_active ON influencers(is_active);

-- =====================================================================
-- DISCOUNT CODES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,                    -- e.g., "SUMMER25", "INFLUENCER_JOHN"
  influencer_id TEXT,                    -- Link to influencers table (can be NULL for general codes)
  discount_type TEXT NOT NULL,           -- "percentage" or "fixed_amount"
  discount_value REAL NOT NULL,          -- e.g., 25.00 for 25% or $25
  min_purchase_amount REAL DEFAULT 0,    -- Minimum purchase required
  max_discount_amount REAL,              -- Maximum discount cap (for percentage discounts)
  usage_limit INTEGER,                   -- Total times code can be used (NULL = unlimited)
  usage_count INTEGER DEFAULT 0,         -- Times code has been used
  per_customer_limit INTEGER DEFAULT 1,  -- Times per customer (1 = one-time use)
  valid_from INTEGER,                    -- Start timestamp
  valid_until INTEGER,                   -- End timestamp
  applicable_procedures TEXT,            -- JSON array of procedure IDs (NULL = all procedures)
  is_active INTEGER DEFAULT 1,           -- 1 = active, 0 = inactive
  notes TEXT,                            -- Internal notes
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (influencer_id) REFERENCES influencers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_codes_unique ON discount_codes(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_influencer ON discount_codes(influencer_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- =====================================================================
-- PAYMENTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,              -- Link to bookings table
  contact_id TEXT NOT NULL,              -- Link to contacts table
  stripe_payment_intent_id TEXT,         -- Stripe PaymentIntent ID
  stripe_charge_id TEXT,                 -- Stripe Charge ID
  amount REAL NOT NULL,                  -- Amount paid (in AUD)
  currency TEXT DEFAULT 'AUD',
  status TEXT NOT NULL,                  -- "pending", "succeeded", "failed", "refunded"
  payment_method TEXT,                   -- "card", "bank_transfer", etc.
  discount_code_id TEXT,                 -- Link to discount_codes table
  discount_amount REAL DEFAULT 0,        -- Amount discounted
  influencer_id TEXT,                    -- Link to influencers table
  metadata TEXT,                         -- JSON for additional data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id),
  FOREIGN KEY (influencer_id) REFERENCES influencers(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments(contact_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_influencer ON payments(influencer_id);

-- =====================================================================
-- UPDATE BOOKINGS TABLE
-- =====================================================================
-- Add procedure and pricing fields to existing bookings table
ALTER TABLE bookings ADD COLUMN procedure_id TEXT;
ALTER TABLE bookings ADD COLUMN procedure_name TEXT;
ALTER TABLE bookings ADD COLUMN base_price REAL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN discount_code TEXT;
ALTER TABLE bookings ADD COLUMN discount_amount REAL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN final_price REAL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN influencer_id TEXT;

-- =====================================================================
-- UPDATE CONTACTS TABLE
-- =====================================================================
-- Add influencer tracking to contacts
ALTER TABLE contacts ADD COLUMN referral_source TEXT;        -- General referral source
ALTER TABLE contacts ADD COLUMN influencer_id TEXT;          -- Link to influencers table
ALTER TABLE contacts ADD COLUMN discount_codes_used TEXT;    -- JSON array of discount code IDs used

-- =====================================================================
-- SEED DATA - Sample Procedures
-- =====================================================================
INSERT OR IGNORE INTO procedures (id, tenant_id, name, description, duration_minutes, base_price, category, is_active, created_at, updated_at)
VALUES
  ('proc_001', 'default', 'Skin Cancer Screening', 'Full body skin cancer screening with AI-assisted detection', 45, 150.00, 'Screening', 1, unixepoch(), unixepoch()),
  ('proc_002', 'default', 'Medical Imaging - X-Ray', 'Digital X-Ray imaging for diagnostic purposes', 30, 200.00, 'Imaging', 1, unixepoch(), unixepoch()),
  ('proc_003', 'default', 'Medical Imaging - Ultrasound', 'Diagnostic ultrasound imaging', 45, 250.00, 'Imaging', 1, unixepoch(), unixepoch()),
  ('proc_004', 'default', 'General Consultation', 'General medical consultation with our specialists', 30, 100.00, 'Consultation', 1, unixepoch(), unixepoch()),
  ('proc_005', 'default', 'Follow-up Appointment', 'Follow-up appointment for existing patients', 20, 75.00, 'Consultation', 1, unixepoch(), unixepoch());

-- =====================================================================
-- SEED DATA - Sample Influencer
-- =====================================================================
INSERT OR IGNORE INTO influencers (id, tenant_id, name, platform, handle, commission_rate, is_active, created_at, updated_at)
VALUES
  ('inf_001', 'default', 'Sample Influencer', 'Instagram', '@sampleinfluencer', 10.00, 1, unixepoch(), unixepoch());

-- =====================================================================
-- SEED DATA - Sample Discount Codes
-- =====================================================================
INSERT OR IGNORE INTO discount_codes (id, tenant_id, code, influencer_id, discount_type, discount_value, usage_limit, is_active, notes, created_at, updated_at)
VALUES
  ('disc_001', 'default', 'WELCOME25', NULL, 'percentage', 25.00, NULL, 1, 'Welcome discount for new customers', unixepoch(), unixepoch()),
  ('disc_002', 'default', 'INFLUENCER10', 'inf_001', 'percentage', 10.00, NULL, 1, 'Influencer referral discount', unixepoch(), unixepoch());
