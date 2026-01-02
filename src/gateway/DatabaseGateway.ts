/**
 * DatabaseGateway - Single Point of Database Access
 *
 * This is the ONLY interface for database operations.
 *
 * Why: OneOS migration path
 * - Today: D1DatabaseGateway implementation (Cloudflare D1)
 * - Future: OneOSDatabaseGateway implementation (ObjectStore)
 * - Services stay unchanged - they only use this interface
 *
 * Architecture Rule: NO service or route handler calls env.DB directly!
 * All database access must flow through this gateway.
 */

import type {
  Contact,
  Booking,
  Task,
  Touchpoint,
  SMSMessage,
  StaffUser,
  AutomationRule,
  SMSTemplate,
  EventLog,
  EmailCampaign,
  EmailTemplate,
  SavedReport,
  HIPAAAuditLog,
  AIUsageLog,
  Location,
  Permission,
  UserPermission,
  IPWhitelist
} from '../types/entities'

// =====================================================================
// REPOSITORY INTERFACES
// =====================================================================

export interface ContactRepository {
  create(data: CreateContactInput): Promise<Contact>
  update(id: string, data: UpdateContactInput): Promise<Contact>
  delete(id: string): Promise<void>
  get(id: string): Promise<Contact | null>
  list(params: ListContactsParams): Promise<PaginatedResult<Contact>>
  findByPhone(phone: string, tenantId: string): Promise<Contact | null>
  findByEmail(email: string, tenantId: string): Promise<Contact | null>
  updateWarmness(id: string, score: number, reasoning?: string): Promise<void>
  search(query: string, tenantId: string): Promise<Contact[]>
}

export interface BookingRepository {
  create(data: CreateBookingInput): Promise<Booking>
  update(id: string, data: UpdateBookingInput): Promise<Booking>
  delete(id: string): Promise<void>
  get(id: string): Promise<Booking | null>
  list(params: ListBookingsParams): Promise<PaginatedResult<Booking>>
  findByContact(contactId: string): Promise<Booking[]>
  findByDateRange(tenantId: string, startDate: number, endDate: number): Promise<Booking[]>
  updateStatus(id: string, status: string): Promise<void>
  assignStaff(id: string, staffId: string): Promise<void>
}

export interface TaskRepository {
  create(data: CreateTaskInput): Promise<Task>
  update(id: string, data: UpdateTaskInput): Promise<Task>
  delete(id: string): Promise<void>
  get(id: string): Promise<Task | null>
  list(params: ListTasksParams): Promise<PaginatedResult<Task>>
  findByContact(contactId: string): Promise<Task[]>
  findByAssignee(assigneeId: string, tenantId: string): Promise<Task[]>
  updateStatus(id: string, status: string): Promise<void>
  complete(id: string): Promise<void>
}

export interface TouchpointRepository {
  create(data: CreateTouchpointInput): Promise<Touchpoint>
  list(contactId: string): Promise<Touchpoint[]>
  listRecent(tenantId: string, limit: number): Promise<Touchpoint[]>
}

export interface SMSMessageRepository {
  create(data: CreateSMSMessageInput): Promise<SMSMessage>
  update(id: string, data: UpdateSMSMessageInput): Promise<SMSMessage>
  get(id: string): Promise<SMSMessage | null>
  list(params: ListSMSMessagesParams): Promise<PaginatedResult<SMSMessage>>
  findByContact(contactId: string): Promise<SMSMessage[]>
  findByProviderMessageId(providerMessageId: string): Promise<SMSMessage | null>
  updateStatus(id: string, status: string, deliveredAt?: number): Promise<void>
}

export interface StaffUserRepository {
  create(data: CreateStaffUserInput): Promise<StaffUser>
  update(id: string, data: UpdateStaffUserInput): Promise<StaffUser>
  delete(id: string): Promise<void>
  get(id: string): Promise<StaffUser | null>
  findByEmail(email: string): Promise<StaffUser | null>
  findByGoogleId(googleId: string): Promise<StaffUser | null>
  list(tenantId?: string): Promise<StaffUser[]>
  updateLastLogin(id: string): Promise<void>
}

export interface LocationRepository {
  create(data: CreateLocationInput): Promise<Location>
  update(id: string, data: UpdateLocationInput): Promise<Location>
  delete(id: string): Promise<void>
  get(id: string): Promise<Location | null>
  findByCode(code: string): Promise<Location | null>
  list(): Promise<Location[]>
  listActive(): Promise<Location[]>
}

export interface PermissionRepository {
  check(params: CheckPermissionParams): Promise<boolean>
  getUserPermissions(userId: string, tenantId: string): Promise<string[]>
  getRolePermissions(role: string): Promise<Permission[]>
  createUserPermission(data: CreateUserPermissionInput): Promise<UserPermission>
  updateUserPermission(id: string, data: UpdateUserPermissionInput): Promise<UserPermission>
  deleteUserPermission(id: string): Promise<void>
  listUserPermissions(userId: string): Promise<UserPermission[]>
}

export interface IPWhitelistRepository {
  isAllowed(ip: string, tenantId: string): Promise<boolean>
  add(data: CreateIPWhitelistInput): Promise<IPWhitelist>
  remove(id: string): Promise<void>
  list(tenantId: string): Promise<IPWhitelist[]>
  listAll(): Promise<IPWhitelist[]>
}

export interface EmailCampaignRepository {
  create(data: CreateEmailCampaignInput): Promise<EmailCampaign>
  update(id: string, data: UpdateEmailCampaignInput): Promise<EmailCampaign>
  delete(id: string): Promise<void>
  get(id: string): Promise<EmailCampaign | null>
  list(tenantId: string): Promise<EmailCampaign[]>
  findByStatus(tenantId: string, status: string): Promise<EmailCampaign[]>
  updateAnalytics(id: string, analytics: CampaignAnalytics): Promise<void>
}

export interface EmailTemplateRepository {
  create(data: CreateEmailTemplateInput): Promise<EmailTemplate>
  update(id: string, data: UpdateEmailTemplateInput): Promise<EmailTemplate>
  delete(id: string): Promise<void>
  get(id: string): Promise<EmailTemplate | null>
  list(tenantId?: string): Promise<EmailTemplate[]>
  findByCategory(category: string, tenantId?: string): Promise<EmailTemplate[]>
}

export interface AutomationRuleRepository {
  create(data: CreateAutomationRuleInput): Promise<AutomationRule>
  update(id: string, data: UpdateAutomationRuleInput): Promise<AutomationRule>
  delete(id: string): Promise<void>
  get(id: string): Promise<AutomationRule | null>
  list(tenantId?: string): Promise<AutomationRule[]>
  findActive(pipeline?: string, stage?: string): Promise<AutomationRule[]>
}

export interface SMSTemplateRepository {
  create(data: CreateSMSTemplateInput): Promise<SMSTemplate>
  update(id: string, data: UpdateSMSTemplateInput): Promise<SMSTemplate>
  delete(id: string): Promise<void>
  get(id: string): Promise<SMSTemplate | null>
  list(tenantId?: string): Promise<SMSTemplate[]>
  findByCategory(category: string): Promise<SMSTemplate[]>
  incrementUsage(id: string): Promise<void>
}

export interface EventLogRepository {
  create(data: CreateEventLogInput): Promise<EventLog>
  list(params: ListEventLogsParams): Promise<PaginatedResult<EventLog>>
  findByEntity(entityType: string, entityId: string): Promise<EventLog[]>
}

export interface HIPAAAuditLogRepository {
  create(data: CreateHIPAAAuditLogInput): Promise<HIPAAAuditLog>
  list(params: ListHIPAAAuditLogsParams): Promise<PaginatedResult<HIPAAAuditLog>>
  findByUser(userId: string, params: DateRangeParams): Promise<HIPAAAuditLog[]>
  findByResource(resourceType: string, resourceId: string): Promise<HIPAAAuditLog[]>
  exportForCompliance(tenantId: string, params: DateRangeParams): Promise<HIPAAAuditLog[]>
}

export interface AIUsageLogRepository {
  create(data: CreateAIUsageLogInput): Promise<AIUsageLog>
  list(params: ListAIUsageLogsParams): Promise<PaginatedResult<AIUsageLog>>
  getUsageByTenant(tenantId: string, params: DateRangeParams): Promise<AIUsageStats>
  getUsageByModel(model: string, params: DateRangeParams): Promise<AIUsageStats>
  getTotalCost(tenantId: string, params: DateRangeParams): Promise<number>
}

export interface SavedReportRepository {
  create(data: CreateSavedReportInput): Promise<SavedReport>
  update(id: string, data: UpdateSavedReportInput): Promise<SavedReport>
  delete(id: string): Promise<void>
  get(id: string): Promise<SavedReport | null>
  list(tenantId: string): Promise<SavedReport[]>
  findScheduled(now: number): Promise<SavedReport[]>
}

// =====================================================================
// MAIN DATABASE GATEWAY INTERFACE
// =====================================================================

/**
 * DatabaseGateway - Main interface for all database operations
 *
 * Implementation:
 * - D1DatabaseGateway (current - Cloudflare D1)
 * - OneOSDatabaseGateway (future - OneOS ObjectStore)
 */
export interface DatabaseGateway {
  // Core repositories
  contacts: ContactRepository
  bookings: BookingRepository
  tasks: TaskRepository
  touchpoints: TouchpointRepository
  smsMessages: SMSMessageRepository
  staffUsers: StaffUserRepository

  // Multi-location & security
  locations: LocationRepository
  permissions: PermissionRepository
  ipWhitelist: IPWhitelistRepository

  // Email marketing
  emailCampaigns: EmailCampaignRepository
  emailTemplates: EmailTemplateRepository

  // Automation
  automationRules: AutomationRuleRepository
  smsTemplates: SMSTemplateRepository

  // Logging & audit
  eventLog: EventLogRepository
  hipaaAuditLog: HIPAAAuditLogRepository
  aiUsageLog: AIUsageLogRepository

  // Reporting
  savedReports: SavedReportRepository

  // Transaction support
  transaction<T>(callback: (tx: DatabaseGateway) => Promise<T>): Promise<T>

  // Health check
  healthCheck(): Promise<boolean>
  // Raw SQL queries (for custom queries not covered by repositories)
  raw<T = any>(query: string, params?: any[]): Promise<T[]>

}

// =====================================================================
// INPUT TYPES (Create/Update)
// =====================================================================

export interface CreateContactInput {
  name: string
  phone: string
  email?: string
  source: string
  current_pipeline: string
  current_stage: string
  tenant_id: string
  is_existing_patient?: boolean
  data?: any
}

export interface UpdateContactInput {
  name?: string
  phone?: string
  email?: string
  current_pipeline?: string
  current_stage?: string
  is_existing_patient?: boolean
  data?: any
}

export interface CreateBookingInput {
  contact_id: string
  tenant_id: string
  wix_booking_id?: string
  service_name: string
  location: string
  appointment_datetime: number
  status: string
  assigned_staff_id?: string
  notes?: string
  data?: any
}

export interface UpdateBookingInput {
  service_name?: string
  location?: string
  appointment_datetime?: number
  status?: string
  assigned_staff_id?: string
  notes?: string
  completed_at?: number
  data?: any
}

export interface CreateTaskInput {
  contact_id: string
  tenant_id: string
  booking_id?: string
  title: string
  description?: string
  task_type: string
  priority?: string
  status?: string
  assigned_to?: string
  due_date?: number
  context?: any
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  task_type?: string
  priority?: string
  status?: string
  assigned_to?: string
  due_date?: number
  completed_at?: number
  context?: any
}

export interface CreateTouchpointInput {
  contact_id: string
  type: string
  channel: string
  direction: string
  summary?: string
  details?: string
  campaign_id?: string
}

export interface CreateSMSMessageInput {
  contact_id: string
  tenant_id: string
  direction: string
  message_body: string
  provider: string
  provider_message_id?: string
  status: string
  automation_rule_id?: string
  task_id?: string
  cost_cents?: number
}

export interface UpdateSMSMessageInput {
  status?: string
  error_message?: string
  detected_intent?: string
  intent_confidence?: number
  delivered_at?: number
}

export interface CreateStaffUserInput {
  email: string
  name: string
  google_id?: string
  role?: string
  permissions?: string[]
  is_active?: boolean
  default_location_id?: string
}

export interface UpdateStaffUserInput {
  email?: string
  name?: string
  role?: string
  permissions?: string[]
  is_active?: boolean
  default_location_id?: string
}

export interface CreateLocationInput {
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  timezone?: string
  phone?: string
  email?: string
  settings?: any
  is_active?: boolean
}

export interface UpdateLocationInput {
  name?: string
  code?: string
  address?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  timezone?: string
  phone?: string
  email?: string
  settings?: any
  is_active?: boolean
}

export interface CreateUserPermissionInput {
  user_id: string
  location_id: string
  role: string
  custom_permissions?: string[]
  is_active?: boolean
}

export interface UpdateUserPermissionInput {
  role?: string
  custom_permissions?: string[]
  is_active?: boolean
}

export interface CreateIPWhitelistInput {
  location_id?: string
  ip_address: string
  ip_version: number
  description?: string
  is_active?: boolean
  created_by: string
}

export interface CreateEmailCampaignInput {
  tenant_id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  audience_filters: any
  status?: string
  scheduled_at?: number
  ai_generated?: boolean
  ai_prompt?: string
  created_by: string
}

export interface UpdateEmailCampaignInput {
  name?: string
  subject?: string
  body_html?: string
  body_text?: string
  audience_filters?: any
  status?: string
  scheduled_at?: number
  sent_at?: number
}

export interface CreateEmailTemplateInput {
  tenant_id?: string
  name: string
  category: string
  subject_template: string
  body_html_template: string
  body_text_template: string
  required_variables?: string[]
  ai_generated?: boolean
  is_active?: boolean
}

export interface UpdateEmailTemplateInput {
  name?: string
  category?: string
  subject_template?: string
  body_html_template?: string
  body_text_template?: string
  required_variables?: string[]
  is_active?: boolean
}

export interface CreateAutomationRuleInput {
  name: string
  description?: string
  trigger_type: string
  trigger_config: any
  pipeline?: string
  stage?: string
  action_type: string
  action_config: any
  is_active?: boolean
}

export interface UpdateAutomationRuleInput {
  name?: string
  description?: string
  trigger_type?: string
  trigger_config?: any
  pipeline?: string
  stage?: string
  action_type?: string
  action_config?: any
  is_active?: boolean
}

export interface CreateSMSTemplateInput {
  name: string
  category: string
  message_template: string
  required_variables?: string[]
  is_active?: boolean
}

export interface UpdateSMSTemplateInput {
  name?: string
  category?: string
  message_template?: string
  required_variables?: string[]
  is_active?: boolean
}

export interface CreateEventLogInput {
  event_type: string
  entity_type?: string
  entity_id?: string
  actor_type: string
  actor_id?: string
  summary?: string
  details?: string
  status: string
  error_message?: string
}

export interface CreateHIPAAAuditLogInput {
  user_id: string
  user_email: string
  user_name: string
  tenant_id: string
  location_name: string
  action: string
  resource_type: string
  resource_id?: string
  resource_summary?: string
  request_method: string
  request_path: string
  request_query?: string
  request_body_hash?: string
  ip_address: string
  user_agent?: string
  status_code: number
  duration_ms: number
  phi_accessed?: boolean
}

export interface CreateAIUsageLogInput {
  tenant_id: string
  model: string
  use_case: string
  prompt_length: number
  max_tokens: number
  tokens_used: number
  response_length: number
  duration_ms: number
  cost_usd: number
  user_id?: string
  resource_type?: string
  resource_id?: string
}

export interface CreateSavedReportInput {
  tenant_id: string
  name: string
  description?: string
  report_type: string
  parameters: any
  schedule?: string
  email_recipients?: string[]
  include_ai_insights?: boolean
  ai_focus?: string
  is_active?: boolean
  created_by: string
}

export interface UpdateSavedReportInput {
  name?: string
  description?: string
  report_type?: string
  parameters?: any
  schedule?: string
  email_recipients?: string[]
  include_ai_insights?: boolean
  ai_focus?: string
  is_active?: boolean
}

// =====================================================================
// QUERY PARAMETER TYPES
// =====================================================================

export interface ListContactsParams {
  tenant_id: string
  pipeline?: string
  stage?: string
  warmness_min?: number
  warmness_max?: number
  source?: string
  limit?: number
  offset?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

export interface ListBookingsParams {
  tenant_id: string
  contact_id?: string
  status?: string
  start_date?: number
  end_date?: number
  assigned_staff_id?: string
  limit?: number
  offset?: number
}

export interface ListTasksParams {
  tenant_id: string
  contact_id?: string
  assigned_to?: string
  status?: string
  priority?: string
  task_type?: string
  due_before?: number
  limit?: number
  offset?: number
}

export interface ListSMSMessagesParams {
  tenant_id: string
  contact_id?: string
  direction?: string
  status?: string
  limit?: number
  offset?: number
}

export interface ListEventLogsParams {
  event_type?: string
  entity_type?: string
  entity_id?: string
  actor_id?: string
  status?: string
  limit?: number
  offset?: number
}

export interface ListHIPAAAuditLogsParams {
  tenant_id: string
  user_id?: string
  action?: string
  resource_type?: string
  resource_id?: string
  phi_accessed?: boolean
  start_date?: number
  end_date?: number
  limit?: number
  offset?: number
}

export interface ListAIUsageLogsParams {
  tenant_id: string
  model?: string
  use_case?: string
  start_date?: number
  end_date?: number
  limit?: number
  offset?: number
}

export interface CheckPermissionParams {
  user_id: string
  tenant_id: string
  permission: string
}

export interface DateRangeParams {
  start_date: number
  end_date: number
}

// =====================================================================
// RESULT TYPES
// =====================================================================

export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface CampaignAnalytics {
  sent_count?: number
  delivered_count?: number
  opened_count?: number
  clicked_count?: number
  bounced_count?: number
  unsubscribed_count?: number
}

export interface AIUsageStats {
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  avg_duration_ms: number
}
