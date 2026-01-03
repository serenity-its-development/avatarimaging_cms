-- Migration 007: Staff and Roles System
-- Adds comprehensive staffing system with roles, permissions, and assignment capabilities

-- =============================================================================
-- ROLES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  permissions TEXT, -- JSON array of permission strings
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- =============================================================================
-- STAFF TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role_id TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  specialties TEXT, -- JSON array of specialty areas
  availability TEXT, -- JSON object with schedule
  is_active BOOLEAN DEFAULT TRUE,
  can_be_assigned BOOLEAN DEFAULT TRUE,
  workload_capacity INTEGER DEFAULT 10, -- Max concurrent assignments
  current_workload INTEGER DEFAULT 0,
  hire_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- =============================================================================
-- STAFF ASSIGNMENTS TABLE (for contacts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_assignments (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  assignment_type TEXT NOT NULL, -- 'primary', 'secondary', 'consultant', etc.
  assigned_by TEXT, -- staff_id who made the assignment
  assigned_at INTEGER NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE(contact_id, staff_id, assignment_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active, can_be_assigned);
CREATE INDEX IF NOT EXISTS idx_staff_workload ON staff(current_workload, workload_capacity);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_contact ON staff_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff ON staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_active ON staff_assignments(is_active);

-- =============================================================================
-- SEED DATA - System Roles
-- =============================================================================
INSERT OR IGNORE INTO roles (id, name, slug, description, color, permissions, is_active, is_system, created_at, updated_at) VALUES
  (
    'role_admin',
    'Administrator',
    'admin',
    'Full system access with all permissions',
    '#EF4444',
    '["all"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_practice_manager',
    'Practice Manager',
    'practice-manager',
    'Manages practice operations, staff, and high-level decisions',
    '#8B5CF6',
    '["contacts.manage", "staff.manage", "reports.view", "settings.manage", "tasks.manage", "bookings.manage"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_radiographer',
    'Radiographer',
    'radiographer',
    'Performs imaging procedures and manages patient scans',
    '#3B82F6',
    '["contacts.view", "contacts.update", "bookings.manage", "tasks.view", "tasks.update"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_receptionist',
    'Receptionist',
    'receptionist',
    'Handles front desk, scheduling, and patient communications',
    '#10B981',
    '["contacts.view", "contacts.create", "contacts.update", "bookings.manage", "tasks.view", "messages.send"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_radiologist',
    'Radiologist',
    'radiologist',
    'Reviews and reports on imaging studies',
    '#F59E0B',
    '["contacts.view", "reports.create", "reports.view", "tasks.view"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_billing_admin',
    'Billing Administrator',
    'billing-admin',
    'Manages billing, invoicing, and insurance claims',
    '#EC4899',
    '["contacts.view", "billing.manage", "reports.view"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'role_it_support',
    'IT Support',
    'it-support',
    'Technical support and system maintenance',
    '#6B7280',
    '["settings.view", "reports.view", "system.debug"]',
    TRUE,
    TRUE,
    unixepoch() * 1000,
    unixepoch() * 1000
  );

-- =============================================================================
-- SEED DATA - Sample Staff Members
-- =============================================================================
INSERT OR IGNORE INTO staff (id, email, first_name, last_name, phone, role_id, specialties, availability, is_active, can_be_assigned, workload_capacity, current_workload, hire_date, created_at, updated_at) VALUES
  (
    'staff_demo_manager',
    'manager@avatarimaging.com.au',
    'Sarah',
    'Johnson',
    '+61400111222',
    'role_practice_manager',
    '["practice management", "staff coordination", "patient relations"]',
    '{"monday": "08:00-17:00", "tuesday": "08:00-17:00", "wednesday": "08:00-17:00", "thursday": "08:00-17:00", "friday": "08:00-17:00"}',
    TRUE,
    TRUE,
    15,
    0,
    unixepoch() * 1000 - (365 * 24 * 60 * 60 * 1000),
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'staff_demo_radiographer1',
    'john.rad@avatarimaging.com.au',
    'John',
    'Smith',
    '+61400222333',
    'role_radiographer',
    '["CT scans", "X-ray", "MRI"]',
    '{"monday": "07:00-15:00", "tuesday": "07:00-15:00", "wednesday": "07:00-15:00", "thursday": "07:00-15:00", "friday": "07:00-15:00"}',
    TRUE,
    TRUE,
    12,
    0,
    unixepoch() * 1000 - (180 * 24 * 60 * 60 * 1000),
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'staff_demo_radiographer2',
    'emma.rad@avatarimaging.com.au',
    'Emma',
    'Williams',
    '+61400333444',
    'role_radiographer',
    '["ultrasound", "mammography", "general X-ray"]',
    '{"monday": "11:00-19:00", "tuesday": "11:00-19:00", "wednesday": "11:00-19:00", "thursday": "11:00-19:00", "friday": "11:00-19:00"}',
    TRUE,
    TRUE,
    12,
    0,
    unixepoch() * 1000 - (90 * 24 * 60 * 60 * 1000),
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'staff_demo_receptionist',
    'reception@avatarimaging.com.au',
    'Lisa',
    'Brown',
    '+61400444555',
    'role_receptionist',
    '["scheduling", "patient intake", "insurance verification"]',
    '{"monday": "08:00-16:00", "tuesday": "08:00-16:00", "wednesday": "08:00-16:00", "thursday": "08:00-16:00", "friday": "08:00-16:00"}',
    TRUE,
    TRUE,
    20,
    0,
    unixepoch() * 1000 - (270 * 24 * 60 * 60 * 1000),
    unixepoch() * 1000,
    unixepoch() * 1000
  ),
  (
    'staff_demo_radiologist',
    'dr.chen@avatarimaging.com.au',
    'David',
    'Chen',
    '+61400555666',
    'role_radiologist',
    '["neuroradiology", "musculoskeletal", "emergency radiology"]',
    '{"monday": "09:00-17:00", "tuesday": "09:00-17:00", "wednesday": "09:00-17:00", "thursday": "09:00-17:00"}',
    TRUE,
    TRUE,
    8,
    0,
    unixepoch() * 1000 - (730 * 24 * 60 * 60 * 1000),
    unixepoch() * 1000,
    unixepoch() * 1000
  );
