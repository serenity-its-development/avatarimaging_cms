-- Avatar Imaging CRM - Resource Booking System Migration
-- Platform: Cloudflare D1 (SQLite)
-- Created: 2026-01-03
-- Version: 3.0.0
-- Features: Resources, Availability, Procedures, Slots, Enhanced Appointments

-- =====================================================================
-- RESOURCE TYPE SYSTEM
-- =====================================================================

-- Resource Types: Categories of bookable resources (people, place, equipment, consumable)
CREATE TABLE resource_types (
  id TEXT PRIMARY KEY,                    -- Format: restype_{ulid}
  code TEXT UNIQUE NOT NULL,              -- 'people', 'place', 'equipment', 'consumable'
  name TEXT NOT NULL,                     -- 'People', 'Place', 'Equipment', 'Consumable'
  description TEXT,
  icon TEXT,                              -- Icon identifier for UI
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- true = cannot delete (core types)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Resource Subtypes: Specific kinds within each type
CREATE TABLE resource_subtypes (
  id TEXT PRIMARY KEY,                    -- Format: ressubtype_{ulid}
  resource_type_id TEXT NOT NULL,         -- FK -> resource_types
  code TEXT NOT NULL,                     -- 'doctor', 'room', 'vectra'
  name TEXT NOT NULL,                     -- 'Doctor', 'Room', 'Vectra Scanner'
  description TEXT,
  metadata_schema TEXT DEFAULT '{}',      -- JSON schema for type-specific fields
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE CASCADE,
  UNIQUE(resource_type_id, code)
);

-- =====================================================================
-- RESOURCES
-- =====================================================================

-- Resources: Actual bookable instances (Dr. Smith, Room 1, Vectra #1)
CREATE TABLE resources (
  id TEXT PRIMARY KEY,                    -- Format: resource_{ulid}
  resource_type_id TEXT NOT NULL,         -- FK -> resource_types
  resource_subtype_id TEXT NOT NULL,      -- FK -> resource_subtypes
  name TEXT NOT NULL,                     -- 'Dr. Smith', 'Room 3', 'Vectra #1'
  description TEXT,

  -- Reservation behavior
  default_reservation_mode TEXT NOT NULL DEFAULT 'exclusive', -- 'exclusive' or 'shared'
  max_concurrent_bookings INTEGER DEFAULT 1, -- For shared mode

  -- Hierarchy (places contain other places/equipment)
  parent_resource_id TEXT,                -- FK -> resources (Place type only)

  -- For consumables (inventory tracking)
  is_consumable BOOLEAN NOT NULL DEFAULT FALSE,
  quantity_on_hand INTEGER,
  quantity_threshold INTEGER,             -- Alert when below this

  -- Link to staff system (for people)
  staff_user_id TEXT,                     -- FK -> staff_users

  -- Location dependencies
  stored_in_resource_id TEXT,             -- FK -> resources (where equipment lives)
  requires_resource_id TEXT,              -- FK -> resources (must book together)

  -- Type-specific metadata
  metadata TEXT DEFAULT '{}',             -- JSON for extensible fields

  -- Multi-tenant
  tenant_id TEXT,                         -- FK -> locations

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (resource_type_id) REFERENCES resource_types(id),
  FOREIGN KEY (resource_subtype_id) REFERENCES resource_subtypes(id),
  FOREIGN KEY (parent_resource_id) REFERENCES resources(id) ON DELETE SET NULL,
  FOREIGN KEY (staff_user_id) REFERENCES staff_users(id) ON DELETE SET NULL,
  FOREIGN KEY (stored_in_resource_id) REFERENCES resources(id) ON DELETE SET NULL,
  FOREIGN KEY (requires_resource_id) REFERENCES resources(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Indexes for resources
CREATE INDEX idx_resources_type ON resources(resource_type_id);
CREATE INDEX idx_resources_subtype ON resources(resource_subtype_id);
CREATE INDEX idx_resources_parent ON resources(parent_resource_id);
CREATE INDEX idx_resources_staff ON resources(staff_user_id);
CREATE INDEX idx_resources_tenant ON resources(tenant_id);
CREATE INDEX idx_resources_active ON resources(is_active);

-- =====================================================================
-- RESOURCE ROLES
-- =====================================================================

-- Roles: Abstract capabilities that resources can fill (Surgeon, Procedure Room)
CREATE TABLE resource_roles (
  id TEXT PRIMARY KEY,                    -- Format: role_{ulid}
  code TEXT UNIQUE NOT NULL,              -- 'surgeon', 'procedure_room', 'scanner'
  name TEXT NOT NULL,                     -- 'Surgeon', 'Procedure Room'
  description TEXT,
  resource_type_id TEXT NOT NULL,         -- FK -> resource_types (which type can fill)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);

CREATE INDEX idx_resource_roles_type ON resource_roles(resource_type_id);

-- Role Assignments: Which resources can fill which roles
CREATE TABLE resource_role_assignments (
  id TEXT PRIMARY KEY,                    -- Format: roleassign_{ulid}
  resource_id TEXT NOT NULL,              -- FK -> resources
  role_id TEXT NOT NULL,                  -- FK -> resource_roles
  priority INTEGER NOT NULL DEFAULT 0,    -- For auto-assignment order (lower = preferred)
  created_at INTEGER NOT NULL,

  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES resource_roles(id) ON DELETE CASCADE,
  UNIQUE(resource_id, role_id)
);

CREATE INDEX idx_role_assignments_resource ON resource_role_assignments(resource_id);
CREATE INDEX idx_role_assignments_role ON resource_role_assignments(role_id);
CREATE INDEX idx_role_assignments_priority ON resource_role_assignments(role_id, priority);

-- =====================================================================
-- RESOURCE AVAILABILITY
-- =====================================================================

-- Availability: Calendar windows for each resource
CREATE TABLE resource_availability (
  id TEXT PRIMARY KEY,                    -- Format: avail_{ulid}
  resource_id TEXT NOT NULL,              -- FK -> resources

  -- Time range (UTC timestamps in milliseconds)
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,

  -- Recurrence pattern (JSON - Calendar/Outlook style)
  recurrence_pattern TEXT,                -- JSON: CalendarRecurrencePattern

  -- What this window means
  availability_type TEXT NOT NULL,        -- 'available' or 'blocked'

  -- Override default reservation mode for this window
  reservation_mode_override TEXT,         -- 'exclusive' or 'shared'
  max_concurrent_override INTEGER,

  reason TEXT,                            -- 'Vacation', 'Training', 'Shared clinic hours'

  -- Audit
  created_by TEXT,                        -- FK -> staff_users
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_availability_resource ON resource_availability(resource_id);
CREATE INDEX idx_availability_time ON resource_availability(start_time, end_time);
CREATE INDEX idx_availability_type ON resource_availability(availability_type);

-- =====================================================================
-- PROCEDURES
-- =====================================================================

-- Procedures: Service templates (Biopsy, 3D Scan, Full Assessment)
CREATE TABLE procedures (
  id TEXT PRIMARY KEY,                    -- Format: procedure_{ulid}
  code TEXT UNIQUE NOT NULL,              -- 'biopsy', '3d_scan', 'full_assessment'
  name TEXT NOT NULL,                     -- 'Skin Biopsy', '3D Full Body Scan'
  description TEXT,

  -- Type
  procedure_type TEXT NOT NULL,           -- 'atomic' or 'composite'

  -- Duration (for atomic procedures)
  duration_minutes INTEGER,               -- NULL for composite (calculated from children)

  -- Buffer times
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,

  -- UI
  color TEXT,                             -- Hex color for calendar display

  -- Multi-tenant
  tenant_id TEXT,                         -- FK -> locations (NULL = global)

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_procedures_type ON procedures(procedure_type);
CREATE INDEX idx_procedures_tenant ON procedures(tenant_id);
CREATE INDEX idx_procedures_active ON procedures(is_active);

-- Procedure Composition: For composite procedures (which atomic procedures make it up)
CREATE TABLE procedure_compositions (
  id TEXT PRIMARY KEY,                    -- Format: proccomp_{ulid}
  parent_procedure_id TEXT NOT NULL,      -- The composite procedure
  child_procedure_id TEXT NOT NULL,       -- The atomic (or nested composite)
  sequence_order INTEGER NOT NULL,        -- Order in the composite (1, 2, 3...)
  gap_after_minutes INTEGER DEFAULT 0,    -- Gap before next step
  created_at INTEGER NOT NULL,

  FOREIGN KEY (parent_procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  FOREIGN KEY (child_procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  UNIQUE(parent_procedure_id, sequence_order)
);

CREATE INDEX idx_proc_comp_parent ON procedure_compositions(parent_procedure_id);
CREATE INDEX idx_proc_comp_child ON procedure_compositions(child_procedure_id);

-- Procedure Requirements: What roles are needed for a procedure
CREATE TABLE procedure_requirements (
  id TEXT PRIMARY KEY,                    -- Format: procreq_{ulid}
  procedure_id TEXT NOT NULL,             -- FK -> procedures (must be atomic)
  role_id TEXT NOT NULL,                  -- FK -> resource_roles

  -- Quantity
  quantity_min INTEGER NOT NULL DEFAULT 1,
  quantity_max INTEGER,                   -- NULL = same as min
  is_required BOOLEAN NOT NULL DEFAULT TRUE,

  -- Time window within procedure (offsets in minutes from procedure start)
  offset_start_minutes INTEGER NOT NULL DEFAULT 0,
  offset_end_minutes INTEGER,             -- NULL = procedure duration

  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES resource_roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_proc_req_procedure ON procedure_requirements(procedure_id);
CREATE INDEX idx_proc_req_role ON procedure_requirements(role_id);

-- =====================================================================
-- PROCEDURE SLOTS
-- =====================================================================

-- Procedure Slots: Schedulable time windows (when a procedure CAN be booked)
CREATE TABLE procedure_slots (
  id TEXT PRIMARY KEY,                    -- Format: slot_{ulid}
  procedure_id TEXT NOT NULL,             -- FK -> procedures

  -- Time (UTC timestamps in milliseconds)
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,              -- Calculated: start + procedure duration

  -- Status
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'booked', 'cancelled', 'blocked'

  -- Recurrence (slots can repeat)
  recurrence_pattern TEXT,                -- JSON: CalendarRecurrencePattern
  parent_slot_id TEXT,                    -- FK -> procedure_slots (if recurring instance)

  -- Generation
  generation_type TEXT NOT NULL DEFAULT 'auto', -- 'auto' or 'manual'

  -- Multi-tenant
  tenant_id TEXT,                         -- FK -> locations

  notes TEXT,
  created_by TEXT,                        -- FK -> staff_users
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_slot_id) REFERENCES procedure_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_slots_procedure ON procedure_slots(procedure_id);
CREATE INDEX idx_slots_time ON procedure_slots(start_time, end_time);
CREATE INDEX idx_slots_status ON procedure_slots(status);
CREATE INDEX idx_slots_tenant ON procedure_slots(tenant_id);

-- =====================================================================
-- APPOINTMENTS
-- =====================================================================

-- Appointments: Actual patient bookings (claims a procedure slot)
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,                    -- Format: appt_{ulid}
  procedure_slot_id TEXT NOT NULL,        -- FK -> procedure_slots
  contact_id TEXT,                        -- FK -> contacts (patient)

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show

  -- Notes
  notes TEXT,

  -- Audit
  created_by TEXT,                        -- FK -> staff_users (or 'patient_self_service')
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  cancelled_at INTEGER,
  completed_at INTEGER,

  FOREIGN KEY (procedure_slot_id) REFERENCES procedure_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE INDEX idx_appointments_slot ON appointments(procedure_slot_id);
CREATE INDEX idx_appointments_contact ON appointments(contact_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created ON appointments(created_at DESC);

-- Appointment Preferences: Patient's preferred/required resources
CREATE TABLE appointment_preferences (
  id TEXT PRIMARY KEY,                    -- Format: apptpref_{ulid}
  appointment_id TEXT NOT NULL,           -- FK -> appointments
  role_id TEXT NOT NULL,                  -- FK -> resource_roles
  resource_id TEXT NOT NULL,              -- FK -> resources

  preference_type TEXT NOT NULL,          -- 'preferred' or 'required'
  priority INTEGER DEFAULT 0,             -- If multiple preferences for same role

  created_at INTEGER NOT NULL,

  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES resource_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE INDEX idx_appt_pref_appointment ON appointment_preferences(appointment_id);
CREATE INDEX idx_appt_pref_role ON appointment_preferences(role_id);

-- Appointment Resources: Assigned resources filling roles
CREATE TABLE appointment_resources (
  id TEXT PRIMARY KEY,                    -- Format: apptres_{ulid}
  appointment_id TEXT NOT NULL,           -- FK -> appointments
  resource_id TEXT NOT NULL,              -- FK -> resources
  role_id TEXT NOT NULL,                  -- FK -> resource_roles

  -- Actual reservation time (calculated from slot + procedure requirement offsets)
  reserved_start INTEGER NOT NULL,        -- UTC timestamp (ms)
  reserved_end INTEGER NOT NULL,

  -- Reservation mode for this specific assignment
  reservation_mode TEXT NOT NULL,         -- 'exclusive' or 'shared'

  -- Status
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'confirmed', 'declined', 'needs_coverage'

  -- For consumables
  quantity_consumed INTEGER,

  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES resource_roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_appt_res_appointment ON appointment_resources(appointment_id);
CREATE INDEX idx_appt_res_resource ON appointment_resources(resource_id);
CREATE INDEX idx_appt_res_time ON appointment_resources(reserved_start, reserved_end);
CREATE INDEX idx_appt_res_status ON appointment_resources(status);

-- =====================================================================
-- CLIENT PREFERENCES
-- =====================================================================

-- Client Preferences: Saved defaults for patients (auto-apply to bookings)
CREATE TABLE client_preferences (
  id TEXT PRIMARY KEY,                    -- Format: clipref_{ulid}
  contact_id TEXT NOT NULL UNIQUE,        -- FK -> contacts

  -- Saved resource preferences (JSON array)
  preferred_resources TEXT DEFAULT '[]',  -- [{ role_id, resource_id, preference_type }]

  -- Location preference
  preferred_location_id TEXT,             -- FK -> resources (Place type)

  -- Scheduling preferences
  preferred_days TEXT,                    -- JSON: ['monday', 'wednesday', 'friday']
  preferred_time_start TEXT,              -- '09:00'
  preferred_time_end TEXT,                -- '12:00'

  -- Communication preferences
  reminder_lead_hours INTEGER DEFAULT 24,
  communication_channel TEXT DEFAULT 'sms', -- 'sms', 'email', 'both'

  -- Accessibility/special needs
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (preferred_location_id) REFERENCES resources(id) ON DELETE SET NULL
);

CREATE INDEX idx_client_pref_contact ON client_preferences(contact_id);

-- =====================================================================
-- ADD PORTAL FIELDS TO CONTACTS (for future client portal)
-- =====================================================================

ALTER TABLE contacts ADD COLUMN password_hash TEXT;
ALTER TABLE contacts ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN portal_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN last_portal_login INTEGER;

-- =====================================================================
-- SEED DATA: Resource Types
-- =====================================================================

INSERT INTO resource_types (id, code, name, description, icon, sort_order, is_system, is_active, created_at, updated_at)
VALUES
  ('restype_people', 'people', 'People', 'Staff members who can be scheduled', 'users', 1, TRUE, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('restype_place', 'place', 'Place', 'Physical locations and rooms', 'map-pin', 2, TRUE, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('restype_equipment', 'equipment', 'Equipment', 'Medical equipment and devices', 'cpu', 3, TRUE, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('restype_consumable', 'consumable', 'Consumable', 'Items that are used up (inventory tracked)', 'package', 4, TRUE, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Resource Subtypes
-- =====================================================================

-- People subtypes
INSERT INTO resource_subtypes (id, resource_type_id, code, name, description, is_active, created_at, updated_at)
VALUES
  ('ressubtype_doctor', 'restype_people', 'doctor', 'Doctor', 'Medical doctors', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_dermoscopist', 'restype_people', 'dermoscopist', 'Dermoscopist', 'Dermoscopy specialists', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_nurse', 'restype_people', 'nurse', 'Nurse', 'Nursing staff', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_receptionist', 'restype_people', 'receptionist', 'Receptionist', 'Front desk staff', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Place subtypes
INSERT INTO resource_subtypes (id, resource_type_id, code, name, description, is_active, created_at, updated_at)
VALUES
  ('ressubtype_clinic', 'restype_place', 'clinic', 'Clinic', 'Medical clinic facility', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_room', 'restype_place', 'room', 'Room', 'Individual room within a clinic', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Equipment subtypes
INSERT INTO resource_subtypes (id, resource_type_id, code, name, description, is_active, created_at, updated_at)
VALUES
  ('ressubtype_vectra', 'restype_equipment', 'vectra', 'Vectra 3D Scanner', 'VECTRA 3D imaging system', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_d200', 'restype_equipment', 'd200', 'D200 Dermoscope', 'D200 digital dermoscope', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('ressubtype_dermoscope', 'restype_equipment', 'dermoscope', 'Dermoscope', 'General dermoscopy device', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Consumable subtypes
INSERT INTO resource_subtypes (id, resource_type_id, code, name, description, is_active, created_at, updated_at)
VALUES
  ('ressubtype_biopsy_kit', 'restype_consumable', 'biopsy_kit', 'Biopsy Kit', 'Single-use biopsy kit', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Resource Roles
-- =====================================================================

INSERT INTO resource_roles (id, code, name, description, resource_type_id, is_active, created_at, updated_at)
VALUES
  -- People roles
  ('role_surgeon', 'surgeon', 'Surgeon', 'Performs surgical procedures', 'restype_people', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_consultant', 'consultant', 'Consultant', 'Provides consultations', 'restype_people', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_support_staff', 'support_staff', 'Support Staff', 'Assists with procedures', 'restype_people', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_scanner_operator', 'scanner_operator', 'Scanner Operator', 'Operates 3D scanning equipment', 'restype_people', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- Place roles
  ('role_procedure_room', 'procedure_room', 'Procedure Room', 'Room suitable for medical procedures', 'restype_place', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_consultation_room', 'consultation_room', 'Consultation Room', 'Room for patient consultations', 'restype_place', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_scanning_room', 'scanning_room', 'Scanning Room', 'Room for 3D scanning', 'restype_place', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- Equipment roles
  ('role_3d_scanner', '3d_scanner', '3D Scanner', '3D imaging device', 'restype_equipment', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('role_dermoscopy_device', 'dermoscopy_device', 'Dermoscopy Device', 'Dermoscopy imaging device', 'restype_equipment', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),

  -- Consumable roles
  ('role_biopsy_supplies', 'biopsy_supplies', 'Biopsy Supplies', 'Supplies needed for biopsy', 'restype_consumable', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Example Resources (Sydney Clinic)
-- =====================================================================

-- Sydney Clinic (place)
INSERT INTO resources (id, resource_type_id, resource_subtype_id, name, description, default_reservation_mode, parent_resource_id, tenant_id, is_active, created_at, updated_at)
VALUES
  ('resource_sydney_clinic', 'restype_place', 'ressubtype_clinic', 'Sydney Clinic', 'Main Avatar Imaging clinic in Sydney', 'shared', NULL, 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Rooms (under Sydney Clinic)
INSERT INTO resources (id, resource_type_id, resource_subtype_id, name, description, default_reservation_mode, parent_resource_id, tenant_id, is_active, created_at, updated_at)
VALUES
  ('resource_room_1', 'restype_place', 'ressubtype_room', 'Room 1', 'Procedure room with scanning equipment', 'exclusive', 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('resource_room_2', 'restype_place', 'ressubtype_room', 'Room 2', 'Consultation and dermoscopy room', 'exclusive', 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('resource_room_3', 'restype_place', 'ressubtype_room', 'Room 3', 'General procedure room', 'exclusive', 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Equipment
INSERT INTO resources (id, resource_type_id, resource_subtype_id, name, description, default_reservation_mode, stored_in_resource_id, parent_resource_id, tenant_id, is_active, created_at, updated_at)
VALUES
  ('resource_vectra_1', 'restype_equipment', 'ressubtype_vectra', 'Vectra #1', 'Primary VECTRA 3D imaging system', 'exclusive', 'resource_room_1', 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('resource_d200_1', 'restype_equipment', 'ressubtype_d200', 'D200 #1', 'D200 dermoscope unit 1', 'exclusive', 'resource_room_2', 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('resource_d200_2', 'restype_equipment', 'ressubtype_d200', 'D200 #2', 'D200 dermoscope unit 2 (portable)', 'exclusive', NULL, 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Consumables
INSERT INTO resources (id, resource_type_id, resource_subtype_id, name, description, default_reservation_mode, is_consumable, quantity_on_hand, quantity_threshold, parent_resource_id, tenant_id, is_active, created_at, updated_at)
VALUES
  ('resource_biopsy_kits', 'restype_consumable', 'ressubtype_biopsy_kit', 'Biopsy Kits', 'Standard biopsy kit supply', 'exclusive', TRUE, 50, 10, 'resource_sydney_clinic', 'location_avatar_sydney', TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Role Assignments for Resources
-- =====================================================================

-- Rooms -> Roles
INSERT INTO resource_role_assignments (id, resource_id, role_id, priority, created_at)
VALUES
  ('roleassign_room1_proc', 'resource_room_1', 'role_procedure_room', 1, strftime('%s', 'now') * 1000),
  ('roleassign_room1_scan', 'resource_room_1', 'role_scanning_room', 1, strftime('%s', 'now') * 1000),
  ('roleassign_room2_proc', 'resource_room_2', 'role_procedure_room', 2, strftime('%s', 'now') * 1000),
  ('roleassign_room2_consult', 'resource_room_2', 'role_consultation_room', 1, strftime('%s', 'now') * 1000),
  ('roleassign_room3_proc', 'resource_room_3', 'role_procedure_room', 3, strftime('%s', 'now') * 1000),
  ('roleassign_room3_consult', 'resource_room_3', 'role_consultation_room', 2, strftime('%s', 'now') * 1000);

-- Equipment -> Roles
INSERT INTO resource_role_assignments (id, resource_id, role_id, priority, created_at)
VALUES
  ('roleassign_vectra_3d', 'resource_vectra_1', 'role_3d_scanner', 1, strftime('%s', 'now') * 1000),
  ('roleassign_d200_1_derm', 'resource_d200_1', 'role_dermoscopy_device', 1, strftime('%s', 'now') * 1000),
  ('roleassign_d200_2_derm', 'resource_d200_2', 'role_dermoscopy_device', 2, strftime('%s', 'now') * 1000);

-- Consumables -> Roles
INSERT INTO resource_role_assignments (id, resource_id, role_id, priority, created_at)
VALUES
  ('roleassign_biopsy_supplies', 'resource_biopsy_kits', 'role_biopsy_supplies', 1, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Example Procedures
-- =====================================================================

-- Atomic Procedures
INSERT INTO procedures (id, code, name, description, procedure_type, duration_minutes, buffer_before_minutes, buffer_after_minutes, color, tenant_id, is_active, created_at, updated_at)
VALUES
  ('proc_3d_scan', '3d_scan', '3D Full Body Scan', 'VECTRA 3D imaging of the full body', 'atomic', 15, 5, 5, '#3B82F6', NULL, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('proc_dermoscopy', 'dermoscopy', 'Dermoscopy Examination', 'Detailed skin examination using dermoscope', 'atomic', 20, 0, 5, '#10B981', NULL, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('proc_consultation', 'consultation', 'Doctor Consultation', 'Consultation with a doctor', 'atomic', 15, 0, 0, '#6366F1', NULL, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('proc_biopsy', 'biopsy', 'Skin Biopsy', 'Skin biopsy procedure', 'atomic', 30, 10, 10, '#EF4444', NULL, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Composite Procedure
INSERT INTO procedures (id, code, name, description, procedure_type, duration_minutes, buffer_before_minutes, buffer_after_minutes, color, tenant_id, is_active, created_at, updated_at)
VALUES
  ('proc_full_assessment', 'full_assessment', 'Full Body Assessment', 'Complete assessment: 3D scan + dermoscopy + consultation', 'composite', NULL, 5, 5, '#8B5CF6', NULL, TRUE, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Composite Procedure Composition
INSERT INTO procedure_compositions (id, parent_procedure_id, child_procedure_id, sequence_order, gap_after_minutes, created_at)
VALUES
  ('proccomp_full_1', 'proc_full_assessment', 'proc_3d_scan', 1, 5, strftime('%s', 'now') * 1000),
  ('proccomp_full_2', 'proc_full_assessment', 'proc_dermoscopy', 2, 5, strftime('%s', 'now') * 1000),
  ('proccomp_full_3', 'proc_full_assessment', 'proc_consultation', 3, 0, strftime('%s', 'now') * 1000);

-- =====================================================================
-- SEED DATA: Procedure Requirements
-- =====================================================================

-- 3D Scan requirements
INSERT INTO procedure_requirements (id, procedure_id, role_id, quantity_min, quantity_max, is_required, offset_start_minutes, offset_end_minutes, notes, created_at, updated_at)
VALUES
  ('procreq_3d_operator', 'proc_3d_scan', 'role_scanner_operator', 1, 1, TRUE, 0, NULL, 'Operator for entire scan', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_3d_room', 'proc_3d_scan', 'role_scanning_room', 1, 1, TRUE, 0, NULL, 'Room with scanning equipment', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_3d_scanner', 'proc_3d_scan', 'role_3d_scanner', 1, 1, TRUE, 0, NULL, 'VECTRA scanner', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Dermoscopy requirements
INSERT INTO procedure_requirements (id, procedure_id, role_id, quantity_min, quantity_max, is_required, offset_start_minutes, offset_end_minutes, notes, created_at, updated_at)
VALUES
  ('procreq_derm_specialist', 'proc_dermoscopy', 'role_consultant', 1, 1, TRUE, 0, NULL, 'Dermoscopy specialist', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_derm_room', 'proc_dermoscopy', 'role_procedure_room', 1, 1, TRUE, 0, NULL, 'Procedure room', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_derm_device', 'proc_dermoscopy', 'role_dermoscopy_device', 1, 1, TRUE, 0, NULL, 'Dermoscope device', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Consultation requirements
INSERT INTO procedure_requirements (id, procedure_id, role_id, quantity_min, quantity_max, is_required, offset_start_minutes, offset_end_minutes, notes, created_at, updated_at)
VALUES
  ('procreq_consult_doctor', 'proc_consultation', 'role_consultant', 1, 1, TRUE, 0, NULL, 'Consulting doctor', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_consult_room', 'proc_consultation', 'role_consultation_room', 1, 1, TRUE, 0, NULL, 'Consultation room', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Biopsy requirements (with partial timing for equipment)
INSERT INTO procedure_requirements (id, procedure_id, role_id, quantity_min, quantity_max, is_required, offset_start_minutes, offset_end_minutes, notes, created_at, updated_at)
VALUES
  ('procreq_biopsy_surgeon', 'proc_biopsy', 'role_surgeon', 1, 1, TRUE, 0, NULL, 'Surgeon for entire procedure', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_biopsy_support', 'proc_biopsy', 'role_support_staff', 0, 1, FALSE, 0, NULL, 'Optional support staff', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_biopsy_room', 'proc_biopsy', 'role_procedure_room', 1, 1, TRUE, 0, NULL, 'Procedure room', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_biopsy_derm', 'proc_biopsy', 'role_dermoscopy_device', 1, 1, TRUE, 5, 20, 'Dermoscope only needed mid-procedure', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('procreq_biopsy_supplies', 'proc_biopsy', 'role_biopsy_supplies', 1, 1, TRUE, 0, NULL, 'Biopsy kit (consumed)', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
