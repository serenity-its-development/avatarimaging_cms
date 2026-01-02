/**
 * Database Entity Types
 * Maps to SQL schema in migrations/001_initial_schema.sql
 */

// =====================================================================
// CORE ENTITIES
// =====================================================================

export interface Contact {
  id: string;                           // contact_{ulid}
  name: string;
  phone: string;                        // E.164 format: +61400000000
  email: string | null;

  // Attribution & Pipeline
  source: string;                       // wix_form, manychat, meta_ad, referral
  current_pipeline: Pipeline;
  current_stage: string;

  // Warmness Scoring
  warmness_score: number;               // 0-100
  warmness_reasoning: string | null;    // AI-generated reasoning
  warmness_updated_at: number | null;   // Unix timestamp (ms)

  // Patient Status
  is_existing_patient: boolean;

  // Custom Fields (JSON)
  data: ContactData;

  // Timestamps
  created_at: number;
  updated_at: number;
}

export interface ContactData {
  intent?: 'routine' | 'high_risk' | 'procedure' | 'referral' | 'other';
  age?: number;
  location?: string;                    // Suburb
  referrer_name?: string;               // For referral source
  utm_source?: string;                  // Marketing attribution
  utm_medium?: string;
  utm_campaign?: string;
  notes?: string;                       // Staff notes
  [key: string]: any;                   // Extensible
}

export type Pipeline =
  | 'lead_to_booking'
  | 'pre_appointment'
  | 'post_appointment'
  | 'partnership';

export interface Booking {
  id: string;                           // booking_{ulid}
  contact_id: string;

  // Wix Integration
  wix_booking_id: string | null;

  // Booking Details
  service_name: string;                 // "Breast Screening", "CT Scan"
  location: string;
  appointment_datetime: number;         // Unix timestamp (ms)
  status: BookingStatus;

  // Staff Assignment
  assigned_staff_id: string | null;

  // Notes
  notes: string | null;

  // Custom Fields
  data: BookingData;

  // Timestamps
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface BookingData {
  parking_info?: string;
  special_requests?: string;
  reminder_sent_24hr?: boolean;
  reminder_sent_2hr?: boolean;
  cancellation_reason?: string;
  [key: string]: any;
}

export interface Task {
  id: string;                           // task_{ulid}
  contact_id: string;
  booking_id: string | null;

  // Task Details
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;

  // Assignment
  assigned_to: string | null;          // Staff user ID

  // Scheduling
  due_date: number | null;              // Unix timestamp (ms)
  completed_at: number | null;

  // Context
  context: TaskContext;

  // Timestamps
  created_at: number;
  updated_at: number;
}

export type TaskType = 'call' | 'sms' | 'email' | 'admin' | 'follow_up';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskContext {
  trigger?: string;                     // "high_warmness_lead", "no_show_follow_up"
  automation_rule_id?: string;
  warmness_at_creation?: number;
  sms_message_id?: string;              // If task created from SMS reply
  [key: string]: any;
}

export interface Touchpoint {
  id: string;                           // touchpoint_{ulid}
  contact_id: string;

  // Touchpoint Details
  type: TouchpointType;
  channel: TouchpointChannel;
  direction: TouchpointDirection;

  // Content
  summary: string | null;
  details: string | null;               // JSON or text

  // Attribution
  campaign_id: string | null;

  // Timestamps
  created_at: number;
}

export type TouchpointType =
  | 'sms_sent'
  | 'sms_received'
  | 'email_sent'
  | 'email_opened'
  | 'booking_created'
  | 'call_made'
  | 'form_submitted'
  | 'link_clicked';

export type TouchpointChannel = 'sms' | 'email' | 'phone' | 'web' | 'manychat';
export type TouchpointDirection = 'inbound' | 'outbound' | 'system';

export interface SMSMessage {
  id: string;                           // sms_{ulid}
  contact_id: string;

  // Message Details
  direction: 'inbound' | 'outbound';
  message_body: string;

  // Provider Integration
  provider: 'clicksend' | 'messagemedia';
  provider_message_id: string | null;

  // Status Tracking
  status: SMSStatus;
  error_message: string | null;

  // AI Intelligence
  detected_intent: SMSIntent | null;
  intent_confidence: number | null;     // 0.0 to 1.0

  // Costs
  cost_cents: number | null;            // Cost in cents (e.g., 4 = $0.04)

  // Context
  automation_rule_id: string | null;
  task_id: string | null;

  // Timestamps
  created_at: number;
  delivered_at: number | null;
}

export type SMSStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
export type SMSIntent = 'confirm' | 'cancel' | 'reschedule' | 'question' | 'unknown';

// =====================================================================
// STAFF & USERS
// =====================================================================

export interface StaffUser {
  id: string;                           // staff_{ulid}
  email: string;
  name: string;

  // Authentication
  google_id: string | null;

  // Permissions
  role: StaffRole;
  permissions: string[];                // JSON array

  // Status
  is_active: boolean;

  // Timestamps
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
}

export type StaffRole = 'admin' | 'manager' | 'staff' | 'readonly';

// =====================================================================
// AUTOMATION & CONFIGURATION
// =====================================================================

export interface AutomationRule {
  id: string;                           // rule_{ulid}

  // Rule Identification
  name: string;
  description: string | null;

  // Trigger Configuration
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;

  // Pipeline Context
  pipeline: Pipeline | null;
  stage: string | null;

  // Action Configuration
  action_type: ActionType;
  action_config: ActionConfig;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: number;
  updated_at: number;
}

export type TriggerType = 'event' | 'time_based' | 'condition_met';

export interface TriggerConfig {
  event?: string;                       // "booking_created", "sms_received"
  conditions?: TriggerCondition[];
  schedule?: string;                    // Cron expression for time_based
  [key: string]: any;
}

export interface TriggerCondition {
  field: string;                        // "warmness_score", "source"
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export type ActionType =
  | 'send_sms'
  | 'create_task'
  | 'update_field'
  | 'move_stage'
  | 'send_email'
  | 'webhook';

export interface ActionConfig {
  template_id?: string;                 // For send_sms/send_email
  delay_minutes?: number;               // Delay before executing
  task_type?: TaskType;                 // For create_task
  task_priority?: TaskPriority;
  field_name?: string;                  // For update_field
  field_value?: any;
  stage?: string;                       // For move_stage
  webhook_url?: string;                 // For webhook
  [key: string]: any;
}

export interface SMSTemplate {
  id: string;                           // template_{ulid}

  // Template Details
  name: string;
  category: TemplateCategory;
  message_template: string;             // "Hi {{name}}, your appointment..."

  // Variables
  required_variables: string[];         // ["name", "appointment_time"]

  // Usage
  usage_count: number;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: number;
  updated_at: number;
}

export type TemplateCategory = 'confirmation' | 'reminder' | 'follow_up' | 'recall' | 'marketing';

// =====================================================================
// AUDIT & LOGGING
// =====================================================================

export interface EventLog {
  id: string;                           // event_{ulid}

  // Event Details
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;

  // Actor
  actor_type: 'system' | 'staff' | 'webhook' | 'automation';
  actor_id: string | null;

  // Event Data
  summary: string | null;
  details: string | null;               // Full JSON payload

  // Result
  status: 'success' | 'failure' | 'partial';
  error_message: string | null;

  // Timestamps
  created_at: number;
}

// =====================================================================
// WARMNESS CALCULATION TYPES
// =====================================================================

export interface WarmnessCriteria {
  intent_score: number;                 // 0-30 points
  source_score: number;                 // 0-20 points
  engagement_score: number;             // 0-40 points
  speed_score: number;                  // -10 to +10 points
  total: number;                        // 0-100
  breakdown: WarmnessFactor[];
}

export interface WarmnessFactor {
  factor: string;
  points: number;
  reason: string;
}

// =====================================================================
// AI-GENERATED TYPES
// =====================================================================

export interface AIWarmness {
  warmness_score: number;               // 0-100
  booking_likelihood: 'high' | 'medium' | 'low';
  recommended_action: string;
  reasoning: string;
  confidence: number;                   // 0.0 to 1.0
}

export interface AISMSIntent {
  intent: SMSIntent;
  confidence: number;
  suggested_response?: string;
  requires_staff_attention: boolean;
}

// =====================================================================
// QUEUE MESSAGE TYPES
// =====================================================================

export interface AutomationQueueMessage {
  type: 'process_automation_rule' | 'recalculate_warmness' | 'move_stage';
  contact_id: string;
  automation_rule_id?: string;
  booking_id?: string;
  task_id?: string;
  context?: any;
}

export interface SMSQueueMessage {
  type: 'send_sms' | 'process_inbound_sms';
  contact_id: string;
  message_body?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
  provider_message_id?: string;         // For inbound processing
  inbound_message?: string;
}

// =====================================================================
// WEBHOOK PAYLOAD TYPES
// =====================================================================

export interface WixWebhookPayload {
  event: string;                        // "bookings/created", "bookings/updated"
  bookingId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  serviceInfo: {
    name: string;
    location: string;
  };
  appointmentDateTime: string;          // ISO 8601
  status: string;
}

export interface ManyChatWebhookPayload {
  subscriber_id: string;
  page_id: string;
  status: string;
  user_profile: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
  custom_fields?: Record<string, any>;
}

export interface SMSWebhookPayload {
  message_id: string;
  from: string;                         // Phone number
  to: string;
  message: string;
  timestamp: string;
  status?: string;
}
