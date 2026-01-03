/**
 * Resource Booking System Types
 * Maps to SQL schema in migrations/003_resource_booking_system.sql
 */

// =====================================================================
// RESOURCE TYPES & SUBTYPES
// =====================================================================

export interface ResourceType {
  id: string;                           // restype_{ulid}
  code: string;                         // 'people', 'place', 'equipment', 'consumable'
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export type ResourceTypeCode = 'people' | 'place' | 'equipment' | 'consumable';

export interface ResourceSubtype {
  id: string;                           // ressubtype_{ulid}
  resource_type_id: string;
  code: string;                         // 'doctor', 'room', 'vectra'
  name: string;
  description: string | null;
  metadata_schema: Record<string, any>;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// =====================================================================
// RESOURCES
// =====================================================================

export interface Resource {
  id: string;                           // resource_{ulid}
  resource_type_id: string;
  resource_subtype_id: string;
  name: string;
  description: string | null;

  // Reservation behavior
  default_reservation_mode: ReservationMode;
  max_concurrent_bookings: number;

  // Hierarchy
  parent_resource_id: string | null;

  // Consumables
  is_consumable: boolean;
  quantity_on_hand: number | null;
  quantity_threshold: number | null;

  // Staff link
  staff_user_id: string | null;

  // Location dependencies
  stored_in_resource_id: string | null;
  requires_resource_id: string | null;

  // Metadata
  metadata: Record<string, any>;

  // Multi-tenant
  tenant_id: string | null;

  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export type ReservationMode = 'exclusive' | 'shared';

// Resource with expanded type info (for API responses)
export interface ResourceWithType extends Resource {
  resource_type?: ResourceType;
  resource_subtype?: ResourceSubtype;
  parent_resource?: Resource | null;
  children?: Resource[];
}

// =====================================================================
// RESOURCE ROLES
// =====================================================================

export interface ResourceRole {
  id: string;                           // role_{ulid}
  code: string;                         // 'surgeon', 'procedure_room'
  name: string;
  description: string | null;
  resource_type_id: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface ResourceRoleAssignment {
  id: string;                           // roleassign_{ulid}
  resource_id: string;
  role_id: string;
  priority: number;
  created_at: number;
}

// Resource with its assigned roles (for API responses)
export interface ResourceWithRoles extends Resource {
  roles: ResourceRole[];
}

// =====================================================================
// RESOURCE AVAILABILITY
// =====================================================================

export interface ResourceAvailability {
  id: string;                           // avail_{ulid}
  resource_id: string;
  start_time: number;                   // UTC timestamp (ms)
  end_time: number;
  recurrence_pattern: CalendarRecurrencePattern | null;
  availability_type: AvailabilityType;
  reservation_mode_override: ReservationMode | null;
  max_concurrent_override: number | null;
  reason: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

export type AvailabilityType = 'available' | 'blocked';

// Calendar/Outlook-style recurrence pattern
export interface CalendarRecurrencePattern {
  type: RecurrenceType;
  interval: number;                     // Every N days/weeks/months/years

  // Weekly specifics
  days_of_week?: DayOfWeek[];
  first_day_of_week?: DayOfWeek;

  // Monthly specifics
  day_of_month?: number;                // e.g., 15th of month
  week_of_month?: WeekOfMonth;
  day_of_week_monthly?: DayOfWeek;      // "The 2nd Tuesday"

  // Yearly specifics
  month?: number;                       // 1-12

  // Range
  range_type: RecurrenceRangeType;
  end_date?: number;                    // UTC timestamp (ms)
  number_of_occurrences?: number;
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type WeekOfMonth = 'first' | 'second' | 'third' | 'fourth' | 'last';
export type RecurrenceRangeType = 'no_end' | 'end_date' | 'numbered';

// Expanded availability window (after recurrence expansion)
export interface ExpandedAvailabilityWindow {
  resource_id: string;
  start_time: number;
  end_time: number;
  availability_type: AvailabilityType;
  reservation_mode: ReservationMode;
  max_concurrent: number;
  source_availability_id: string;       // Original ResourceAvailability id
}

// =====================================================================
// PROCEDURES
// =====================================================================

export interface Procedure {
  id: string;                           // procedure_{ulid}
  code: string;
  name: string;
  description: string | null;
  procedure_type: ProcedureType;
  duration_minutes: number | null;      // NULL for composite
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  color: string | null;
  tenant_id: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export type ProcedureType = 'atomic' | 'composite';

export interface ProcedureComposition {
  id: string;                           // proccomp_{ulid}
  parent_procedure_id: string;
  child_procedure_id: string;
  sequence_order: number;
  gap_after_minutes: number;
  created_at: number;
}

export interface ProcedureRequirement {
  id: string;                           // procreq_{ulid}
  procedure_id: string;
  role_id: string;
  quantity_min: number;
  quantity_max: number | null;
  is_required: boolean;
  offset_start_minutes: number;
  offset_end_minutes: number | null;    // NULL = procedure duration
  notes: string | null;
  created_at: number;
  updated_at: number;
}

// Procedure with all details expanded (for API responses)
export interface ProcedureWithDetails extends Procedure {
  requirements: ProcedureRequirementWithRole[];
  children?: ProcedureWithDetails[];    // For composite procedures
  total_duration_minutes: number;       // Calculated for composites
}

export interface ProcedureRequirementWithRole extends ProcedureRequirement {
  role: ResourceRole;
  available_resources?: Resource[];     // Resources that can fill this role
}

// =====================================================================
// PROCEDURE SLOTS
// =====================================================================

export interface ProcedureSlot {
  id: string;                           // slot_{ulid}
  procedure_id: string;
  start_time: number;                   // UTC timestamp (ms)
  end_time: number;
  status: SlotStatus;
  recurrence_pattern: CalendarRecurrencePattern | null;
  parent_slot_id: string | null;
  generation_type: SlotGenerationType;
  tenant_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

export type SlotStatus = 'available' | 'booked' | 'cancelled' | 'blocked';
export type SlotGenerationType = 'auto' | 'manual';

// Slot with procedure details (for API responses)
export interface ProcedureSlotWithDetails extends ProcedureSlot {
  procedure: Procedure;
  available_resources?: ResourcesByRole; // Resources available for this slot
}

// =====================================================================
// APPOINTMENTS
// =====================================================================

export interface Appointment {
  id: string;                           // appt_{ulid}
  procedure_slot_id: string;
  contact_id: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  cancelled_at: number | null;
  completed_at: number | null;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface AppointmentPreference {
  id: string;                           // apptpref_{ulid}
  appointment_id: string;
  role_id: string;
  resource_id: string;
  preference_type: PreferenceType;
  priority: number;
  created_at: number;
}

export type PreferenceType = 'preferred' | 'required';

export interface AppointmentResource {
  id: string;                           // apptres_{ulid}
  appointment_id: string;
  resource_id: string;
  role_id: string;
  reserved_start: number;               // UTC timestamp (ms)
  reserved_end: number;
  reservation_mode: ReservationMode;
  status: AppointmentResourceStatus;
  quantity_consumed: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type AppointmentResourceStatus = 'assigned' | 'confirmed' | 'declined' | 'needs_coverage';

// Appointment with all details (for API responses)
export interface AppointmentWithDetails extends Appointment {
  procedure_slot: ProcedureSlot;
  procedure: Procedure;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  preferences: AppointmentPreferenceWithDetails[];
  resources: AppointmentResourceWithDetails[];
}

export interface AppointmentPreferenceWithDetails extends AppointmentPreference {
  role: ResourceRole;
  resource: Resource;
}

export interface AppointmentResourceWithDetails extends AppointmentResource {
  role: ResourceRole;
  resource: Resource;
}

// =====================================================================
// CLIENT PREFERENCES
// =====================================================================

export interface ClientPreferences {
  id: string;                           // clipref_{ulid}
  contact_id: string;
  preferred_resources: ClientResourcePreference[];
  preferred_location_id: string | null;
  preferred_days: DayOfWeek[] | null;
  preferred_time_start: string | null;  // 'HH:MM' format
  preferred_time_end: string | null;
  reminder_lead_hours: number;
  communication_channel: CommunicationChannel;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface ClientResourcePreference {
  role_id: string;
  resource_id: string;
  preference_type: PreferenceType;
}

export type CommunicationChannel = 'sms' | 'email' | 'both';

// =====================================================================
// AVAILABILITY CHECKING
// =====================================================================

// Result of checking resource availability for a time window
export interface ResourceAvailabilityCheck {
  resource_id: string;
  is_available: boolean;
  reservation_mode: ReservationMode;
  current_bookings: number;
  max_concurrent: number;
  conflicts: ResourceConflict[];
}

export interface ResourceConflict {
  appointment_id: string;
  reserved_start: number;
  reserved_end: number;
  reservation_mode: ReservationMode;
}

// =====================================================================
// SLOT GENERATION
// =====================================================================

// Input for generating available slots
export interface SlotGenerationRequest {
  procedure_id: string;
  start_date: number;                   // UTC timestamp
  end_date: number;
  tenant_id?: string;
  location_resource_id?: string;        // Filter by location
}

// Result of slot generation
export interface GeneratedSlot {
  start_time: number;
  end_time: number;
  available_resource_combinations: ResourceCombination[];
}

export interface ResourceCombination {
  resources: ResourceAssignment[];
  priority_score: number;               // Lower = better
}

export interface ResourceAssignment {
  role_id: string;
  resource_id: string;
  reserved_start: number;
  reserved_end: number;
}

// =====================================================================
// BOOKING REQUEST
// =====================================================================

export interface BookingRequest {
  procedure_id: string;
  slot_id?: string;                     // If booking existing slot
  start_time?: number;                  // If creating new slot
  contact_id: string;
  preferences?: {
    role_id: string;
    resource_id: string;
    preference_type: PreferenceType;
  }[];
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  appointment?: AppointmentWithDetails;
  conflicts?: ResourceConflict[];
  suggested_alternatives?: GeneratedSlot[];
  warnings?: string[];                  // e.g., "Low inventory: 2 biopsy kits remaining"
}

// =====================================================================
// API INPUT TYPES
// =====================================================================

export interface CreateResourceInput {
  resource_type_id: string;
  resource_subtype_id: string;
  name: string;
  description?: string;
  default_reservation_mode?: ReservationMode;
  max_concurrent_bookings?: number;
  parent_resource_id?: string;
  is_consumable?: boolean;
  quantity_on_hand?: number;
  quantity_threshold?: number;
  staff_user_id?: string;
  stored_in_resource_id?: string;
  requires_resource_id?: string;
  metadata?: Record<string, any>;
  tenant_id?: string;
  role_ids?: string[];                  // Roles this resource can fill
}

export interface UpdateResourceInput {
  name?: string;
  description?: string;
  default_reservation_mode?: ReservationMode;
  max_concurrent_bookings?: number;
  parent_resource_id?: string | null;
  is_consumable?: boolean;
  quantity_on_hand?: number;
  quantity_threshold?: number;
  stored_in_resource_id?: string | null;
  requires_resource_id?: string | null;
  metadata?: Record<string, any>;
  is_active?: boolean;
  role_ids?: string[];
}

export interface CreateAvailabilityInput {
  resource_id: string;
  start_time: number;
  end_time: number;
  recurrence_pattern?: CalendarRecurrencePattern;
  availability_type: AvailabilityType;
  reservation_mode_override?: ReservationMode;
  max_concurrent_override?: number;
  reason?: string;
}

export interface CreateProcedureInput {
  code: string;
  name: string;
  description?: string;
  procedure_type: ProcedureType;
  duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  color?: string;
  tenant_id?: string;
  requirements?: CreateProcedureRequirementInput[];
  children?: {                          // For composite
    procedure_id: string;
    sequence_order: number;
    gap_after_minutes?: number;
  }[];
}

export interface CreateProcedureRequirementInput {
  role_id: string;
  quantity_min: number;
  quantity_max?: number;
  is_required?: boolean;
  offset_start_minutes?: number;
  offset_end_minutes?: number;
  notes?: string;
}

export interface CreateAppointmentInput {
  procedure_slot_id: string;
  contact_id: string;
  preferences?: {
    role_id: string;
    resource_id: string;
    preference_type: PreferenceType;
  }[];
  notes?: string;
}

// =====================================================================
// HELPER TYPES
// =====================================================================

// Resources grouped by role (for slot availability display)
export interface ResourcesByRole {
  [roleId: string]: {
    role: ResourceRole;
    resources: Resource[];
  };
}

// Time range helper
export interface TimeRange {
  start: number;
  end: number;
}

// Conflict check result
export interface ConflictCheckResult {
  has_conflict: boolean;
  conflicts: {
    resource_id: string;
    resource_name: string;
    existing_appointment_id: string;
    overlap_start: number;
    overlap_end: number;
  }[];
}
