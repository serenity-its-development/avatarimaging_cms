/**
 * API Client for Avatar Imaging CRM
 * Connects to deployed Cloudflare Worker backend
 */

// API Base URL - Same worker serves frontend + API
const API_BASE_URL = ''

/**
 * Generic API request handler with error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    // Handle non-JSON responses (like health check)
    const contentType = response.headers.get('content-type')
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      throw new Error(
        typeof data === 'object' && data.error
          ? data.error
          : `API Error: ${response.status} ${response.statusText}`
      )
    }

    return data as T
  } catch (error) {
    console.error('API Request Failed:', error)
    throw error
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export async function checkHealth(): Promise<{ status: string; ai: string }> {
  return apiRequest('/health')
}

// =============================================================================
// CONTACTS API
// =============================================================================

export interface Contact {
  id: string
  name: string
  phone?: string
  email?: string
  source: string
  current_pipeline: string
  current_stage: string
  warmness_score?: number
  created_at: number
  data?: Record<string, any>
}

export interface CreateContactInput {
  name: string
  phone?: string
  email?: string
  source: string
  current_pipeline?: string
  current_stage?: string
  data?: Record<string, any>
}

export async function getContacts(params?: {
  pipeline?: string
  stage?: string
  recent?: boolean
  limit?: number
}): Promise<Contact[]> {
  const query = new URLSearchParams()
  if (params?.pipeline) query.set('pipeline', params.pipeline)
  if (params?.stage) query.set('stage', params.stage)
  if (params?.recent) query.set('recent', 'true')
  if (params?.limit) query.set('limit', params.limit.toString())

  const queryString = query.toString()
  const result = await apiRequest(`/api/contacts${queryString ? `?${queryString}` : ''}`)

  // Handle paginated response from backend
  return result.data || result
}

export async function getContact(id: string): Promise<Contact> {
  return apiRequest(`/api/contacts/${id}`)
}

export async function createContact(data: CreateContactInput): Promise<Contact> {
  return apiRequest('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateContact(
  id: string,
  data: Partial<Contact>
): Promise<Contact> {
  return apiRequest(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteContact(id: string): Promise<void> {
  return apiRequest(`/api/contacts/${id}`, {
    method: 'DELETE',
  })
}

export async function recalculateWarmness(id: string): Promise<{ warmness_score: number }> {
  return apiRequest(`/api/contacts/${id}/recalculate-warmness`, {
    method: 'POST',
  })
}

// =============================================================================
// TASKS API
// =============================================================================

export interface Task {
  id: string
  contact_id: string
  type: string
  title: string
  description?: string
  assigned_to?: string
  due_date?: number
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: number
  completed_at?: number
}

export interface CreateTaskInput {
  contact_id: string
  type: string
  title: string
  description?: string
  assigned_to?: string
  due_date?: number
  priority?: string
}

export async function getTasks(params?: {
  urgent?: boolean
  status?: string
  assigned_to?: string
}): Promise<Task[]> {
  const query = new URLSearchParams()
  if (params?.urgent) query.set('urgent', 'true')
  if (params?.status) query.set('status', params.status)
  if (params?.assigned_to) query.set('assigned_to', params.assigned_to)

  const queryString = query.toString()
  const result = await apiRequest(`/api/tasks${queryString ? `?${queryString}` : ''}`)

  // Handle paginated response from backend
  return result.data || result
}

export async function getTask(id: string): Promise<Task> {
  return apiRequest(`/api/tasks/${id}`)
}

export async function getContactTasks(contactId: string): Promise<Task[]> {
  return apiRequest(`/api/tasks/contact/${contactId}`)
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  return apiRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteTask(id: string): Promise<void> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'DELETE',
  })
}

// =============================================================================
// BOOKINGS API
// =============================================================================

export interface Booking {
  id: string
  contact_id: string
  wix_booking_id?: string
  appointment_date: number
  service_type: string
  urgency_level: string
  status: string
  outcome?: string
  created_at: number
}

export async function getBookings(params?: { date?: string }): Promise<Booking[]> {
  const query = new URLSearchParams()
  if (params?.date) query.set('date', params.date)

  const queryString = query.toString()
  return apiRequest(`/api/bookings${queryString ? `?${queryString}` : ''}`)
}

export async function getBooking(id: string): Promise<Booking> {
  return apiRequest(`/api/bookings/${id}`)
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  return apiRequest('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
  return apiRequest(`/api/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteBooking(id: string): Promise<void> {
  return apiRequest(`/api/bookings/${id}`, {
    method: 'DELETE',
  })
}

// =============================================================================
// REPORTS API
// =============================================================================

export interface DashboardStats {
  total_contacts: number
  pending_tasks: number
  bookings_today: number
  avg_warmness: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest('/api/reports/dashboard')
}

export async function getPerformanceReport(): Promise<any> {
  return apiRequest('/api/reports/performance')
}

// =============================================================================
// AI API
// =============================================================================

export interface AIQueryRequest {
  message: string
  context?: Record<string, any>
}

export interface AIQueryResponse {
  response: string
  action?: string
  data?: any
}

export async function queryAI(data: AIQueryRequest): Promise<AIQueryResponse> {
  return apiRequest('/api/ai/query', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// MESSAGES API
// =============================================================================

export async function sendSMS(data: {
  to: string
  message: string
}): Promise<any> {
  return apiRequest('/api/messages/sms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function sendEmail(data: {
  to: string
  subject: string
  body: string
}): Promise<any> {
  return apiRequest('/api/messages/email', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// PIPELINES API
// =============================================================================

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  key: string
  description?: string
  color?: string
  display_order: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  color?: string
  is_active: boolean
  is_default: boolean
  display_order: number
  created_at: number
  updated_at: number
  stages?: PipelineStage[]
}

export interface CreatePipelineInput {
  name: string
  description?: string
  color?: string
  stages: Array<{
    name: string
    key: string
    description?: string
    color?: string
  }>
}

export interface UpdatePipelineInput {
  name?: string
  description?: string
  color?: string
  is_active?: boolean
  is_default?: boolean
  display_order?: number
}

export interface UpdateStageInput {
  name?: string
  key?: string
  description?: string
  color?: string
  display_order?: number
  is_active?: boolean
}

export async function getPipelines(includeInactive = false): Promise<Pipeline[]> {
  const query = includeInactive ? '?include_inactive=true' : ''
  const result = await apiRequest<{ success: boolean; data: Pipeline[] }>(`/api/pipelines${query}`)
  return result.data
}

export async function getPipeline(id: string): Promise<Pipeline> {
  const result = await apiRequest<{ success: boolean; data: Pipeline }>(`/api/pipelines/${id}`)
  return result.data
}

export async function getDefaultPipeline(): Promise<Pipeline> {
  const result = await apiRequest<{ success: boolean; data: Pipeline }>('/api/pipelines/default')
  return result.data
}

export async function createPipeline(data: CreatePipelineInput): Promise<Pipeline> {
  const result = await apiRequest<{ success: boolean; data: Pipeline }>('/api/pipelines', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function updatePipeline(id: string, data: UpdatePipelineInput): Promise<Pipeline> {
  const result = await apiRequest<{ success: boolean; data: Pipeline }>(`/api/pipelines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function deletePipeline(id: string): Promise<void> {
  await apiRequest(`/api/pipelines/${id}`, {
    method: 'DELETE',
  })
}

export async function createStage(
  pipelineId: string,
  data: { name: string; key: string; description?: string; color?: string }
): Promise<PipelineStage> {
  const result = await apiRequest<{ success: boolean; data: PipelineStage }>(
    `/api/pipelines/${pipelineId}/stages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  return result.data
}

export async function updateStage(
  pipelineId: string,
  stageId: string,
  data: UpdateStageInput
): Promise<PipelineStage> {
  const result = await apiRequest<{ success: boolean; data: PipelineStage }>(
    `/api/pipelines/${pipelineId}/stages/${stageId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  )
  return result.data
}

export async function deleteStage(pipelineId: string, stageId: string): Promise<void> {
  await apiRequest(`/api/pipelines/${pipelineId}/stages/${stageId}`, {
    method: 'DELETE',
  })
}

export async function reorderStages(
  pipelineId: string,
  stages: Array<{ stage_id: string; new_order: number }>
): Promise<PipelineStage[]> {
  const result = await apiRequest<{ success: boolean; data: PipelineStage[] }>(
    `/api/pipelines/${pipelineId}/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ stages }),
    }
  )
  return result.data
}

// =============================================================================
// TAGS API
// =============================================================================

export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  category: string
  usage_count: number
  is_ai_generated: boolean
  ai_reasoning?: string
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface ContactTag {
  id: string
  contact_id: string
  tag_id: string
  added_by?: string
  confidence?: number
  created_at: number
  tag?: Tag
}

export interface CreateTagInput {
  name: string
  description?: string
  color?: string
  category: string
}

export interface UpdateTagInput {
  name?: string
  description?: string
  color?: string
  category?: string
  is_active?: boolean
}

export interface AITagSuggestion {
  tag_name: string
  slug: string
  category: string
  reasoning: string
  confidence: number
  color?: string
}

export async function getTags(category?: string, includeInactive = false): Promise<Tag[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (includeInactive) params.set('include_inactive', 'true')

  const query = params.toString()
  const result = await apiRequest<{ success: boolean; data: Tag[] }>(`/api/tags${query ? `?${query}` : ''}`)
  return result.data
}

export async function getTag(id: string): Promise<Tag> {
  const result = await apiRequest<{ success: boolean; data: Tag }>(`/api/tags/${id}`)
  return result.data
}

export async function createTag(data: CreateTagInput): Promise<Tag> {
  const result = await apiRequest<{ success: boolean; data: Tag }>('/api/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function updateTag(id: string, data: UpdateTagInput): Promise<Tag> {
  const result = await apiRequest<{ success: boolean; data: Tag }>(`/api/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function deleteTag(id: string): Promise<void> {
  await apiRequest(`/api/tags/${id}`, {
    method: 'DELETE',
  })
}

export async function getContactTags(contactId: string): Promise<ContactTag[]> {
  const result = await apiRequest<{ success: boolean; data: ContactTag[] }>(`/api/tags/contact/${contactId}`)
  return result.data
}

export async function addTagToContact(contactId: string, tagId: string, addedBy?: string): Promise<void> {
  await apiRequest(`/api/tags/contact/${contactId}`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagId, added_by: addedBy }),
  })
}

export async function removeTagFromContact(contactId: string, tagId: string): Promise<void> {
  await apiRequest(`/api/tags/contact/${contactId}/${tagId}`, {
    method: 'DELETE',
  })
}

export async function suggestTags(contactData: any): Promise<AITagSuggestion[]> {
  const result = await apiRequest<{ success: boolean; data: AITagSuggestion[] }>('/api/tags/suggest', {
    method: 'POST',
    body: JSON.stringify(contactData),
  })
  return result.data
}

export async function autoTagContact(contactId: string, contactData: any, minConfidence = 0.7): Promise<Tag[]> {
  const result = await apiRequest<{ success: boolean; data: Tag[] }>(`/api/tags/auto-tag/${contactId}`, {
    method: 'POST',
    body: JSON.stringify({ ...contactData, min_confidence: minConfidence }),
  })
  return result.data
}

// =============================================================================
// STAFF & ROLES
// =============================================================================

export interface Role {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  permissions: string[]
  is_active: boolean
  is_system: boolean
  created_at: number
  updated_at: number
}

export interface Staff {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role_id: string
  role?: Role
  avatar_url?: string
  bio?: string
  specialties: string[]
  availability: Record<string, string>
  is_active: boolean
  can_be_assigned: boolean
  workload_capacity: number
  current_workload: number
  hire_date?: number
  created_at: number
  updated_at: number
}

export interface StaffAssignment {
  id: string
  contact_id: string
  staff_id: string
  staff?: Staff
  assignment_type: 'primary' | 'secondary' | 'consultant' | 'specialist' | 'support'
  assigned_by?: string
  assigned_at: number
  notes?: string
  is_active: boolean
  created_at: number
}

export interface CreateRoleInput {
  name: string
  slug: string
  description?: string
  color?: string
  permissions: string[]
}

export interface UpdateRoleInput {
  name?: string
  description?: string
  color?: string
  permissions?: string[]
  is_active?: boolean
}

export interface CreateStaffInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role_id: string
  avatar_url?: string
  bio?: string
  specialties?: string[]
  availability?: Record<string, string>
  workload_capacity?: number
  hire_date?: number
}

export interface UpdateStaffInput {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  role_id?: string
  avatar_url?: string
  bio?: string
  specialties?: string[]
  availability?: Record<string, string>
  is_active?: boolean
  can_be_assigned?: boolean
  workload_capacity?: number
}

export interface AssignStaffInput {
  contact_id: string
  staff_id: string
  assignment_type: StaffAssignment['assignment_type']
  assigned_by?: string
  notes?: string
}

export interface AIStaffSuggestion {
  staff_id: string
  staff_name: string
  role: string
  confidence: number
  reasoning: string
  estimated_workload: number
  specialties_match: string[]
}

// Roles
export async function getRoles(includeInactive = false): Promise<Role[]> {
  const params = new URLSearchParams()
  if (includeInactive) params.set('include_inactive', 'true')
  const query = params.toString()
  return apiRequest(`/api/roles${query ? `?${query}` : ''}`)
}

export async function getRole(id: string): Promise<Role> {
  return apiRequest(`/api/roles/${id}`)
}

export async function createRole(data: CreateRoleInput): Promise<Role> {
  return apiRequest('/api/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateRole(id: string, data: UpdateRoleInput): Promise<Role> {
  return apiRequest(`/api/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteRole(id: string): Promise<void> {
  await apiRequest(`/api/roles/${id}`, { method: 'DELETE' })
}

// Staff
export async function getStaff(options?: {
  includeInactive?: boolean
  roleId?: string
  canBeAssigned?: boolean
}): Promise<Staff[]> {
  const params = new URLSearchParams()
  if (options?.includeInactive) params.set('include_inactive', 'true')
  if (options?.roleId) params.set('role_id', options.roleId)
  if (options?.canBeAssigned !== undefined) params.set('can_be_assigned', String(options.canBeAssigned))
  const query = params.toString()
  return apiRequest(`/api/staff${query ? `?${query}` : ''}`)
}

export async function getStaffMember(id: string): Promise<Staff> {
  return apiRequest(`/api/staff/${id}`)
}

export async function createStaff(data: CreateStaffInput): Promise<Staff> {
  return apiRequest('/api/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateStaff(id: string, data: UpdateStaffInput): Promise<Staff> {
  return apiRequest(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteStaff(id: string): Promise<void> {
  await apiRequest(`/api/staff/${id}`, { method: 'DELETE' })
}

// Staff Assignments
export async function getContactStaffAssignments(contactId: string): Promise<StaffAssignment[]> {
  return apiRequest(`/api/staff/assignments/contact/${contactId}`)
}

export async function getStaffAssignments(staffId: string): Promise<StaffAssignment[]> {
  return apiRequest(`/api/staff/assignments/staff/${staffId}`)
}

export async function assignStaff(data: AssignStaffInput): Promise<StaffAssignment> {
  return apiRequest('/api/staff/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function unassignStaff(contactId: string, staffId: string): Promise<void> {
  await apiRequest(`/api/staff/assignments/${contactId}/${staffId}`, { method: 'DELETE' })
}

// AI Staff Suggestions
export async function suggestStaff(
  contactData: {
    name: string
    current_pipeline?: string
    current_stage?: string
    source?: string
    data?: Record<string, any>
  },
  assignmentType: StaffAssignment['assignment_type'] = 'primary'
): Promise<AIStaffSuggestion[]> {
  return apiRequest('/api/staff/suggest', {
    method: 'POST',
    body: JSON.stringify({ contactData, assignmentType }),
  })
}

// =============================================================================
// TEMPLATES
// =============================================================================

export interface Template {
  id: string
  tenant_id: string
  name: string
  description?: string
  category: 'email' | 'sms' | 'social' | 'ai_context' | 'notification'
  subject?: string
  body: string
  ai_system_prompt?: string
  ai_temperature?: number
  ai_max_tokens?: number
  variables?: string[]
  quick_button_label?: string
  quick_button_icon?: string
  tags?: string[]
  is_default: boolean
  is_active: boolean
  created_at: number
  updated_at: number
  created_by: string
  last_used_at?: number
  use_count: number
}

export interface CreateTemplateInput {
  name: string
  description?: string
  category: 'email' | 'sms' | 'social' | 'ai_context' | 'notification'
  subject?: string
  body: string
  ai_system_prompt?: string
  ai_temperature?: number
  ai_max_tokens?: number
  variables?: string[]
  quick_button_label?: string
  quick_button_icon?: string
  tags?: string[]
  is_default?: boolean
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: 'email' | 'sms' | 'social' | 'ai_context' | 'notification'
  subject?: string
  body?: string
  ai_system_prompt?: string
  ai_temperature?: number
  ai_max_tokens?: number
  variables?: string[]
  quick_button_label?: string
  quick_button_icon?: string
  tags?: string[]
  is_default?: boolean
}

export interface RenderTemplateResult {
  subject?: string
  body: string
  missing_variables: string[]
}

export async function getTemplates(filters?: {
  category?: string
  active_only?: boolean
  with_quick_buttons?: boolean
  search?: string
}): Promise<Template[]> {
  const params = new URLSearchParams()
  if (filters?.category) params.set('category', filters.category)
  if (filters?.active_only) params.set('active_only', 'true')
  if (filters?.with_quick_buttons) params.set('with_quick_buttons', 'true')
  if (filters?.search) params.set('search', filters.search)

  const query = params.toString()
  const result = await apiRequest<{ success: boolean; data: Template[] }>(
    `/api/templates${query ? `?${query}` : ''}`
  )
  return result.data
}

export async function getTemplate(id: string): Promise<Template> {
  const result = await apiRequest<{ success: boolean; data: Template }>(`/api/templates/${id}`)
  return result.data
}

export async function getDefaultTemplate(category: string): Promise<Template> {
  const result = await apiRequest<{ success: boolean; data: Template }>(
    `/api/templates/default/${category}`
  )
  return result.data
}

export async function getQuickActionTemplates(category?: string): Promise<Template[]> {
  const params = new URLSearchParams()
  if (category) params.set('category', category)

  const query = params.toString()
  const result = await apiRequest<{ success: boolean; data: Template[] }>(
    `/api/templates/quick-actions${query ? `?${query}` : ''}`
  )
  return result.data
}

export async function createTemplate(data: CreateTemplateInput): Promise<Template> {
  const result = await apiRequest<{ success: boolean; data: Template }>('/api/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function updateTemplate(id: string, data: UpdateTemplateInput): Promise<Template> {
  const result = await apiRequest<{ success: boolean; data: Template }>(`/api/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return result.data
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiRequest(`/api/templates/${id}`, {
    method: 'DELETE',
  })
}

export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): Promise<RenderTemplateResult> {
  const result = await apiRequest<{ success: boolean; data: RenderTemplateResult }>(
    `/api/templates/${templateId}/render`,
    {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }
  )
  return result.data
}

export async function executeAITemplate(
  templateId: string,
  variables: Record<string, string>
): Promise<string> {
  const result = await apiRequest<{ success: boolean; data: { result: string } }>(
    `/api/templates/${templateId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify({ variables }),
    }
  )
  return result.data.result
}

export async function duplicateTemplate(templateId: string, newName: string): Promise<Template> {
  const result = await apiRequest<{ success: boolean; data: Template }>(
    `/api/templates/${templateId}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({ new_name: newName }),
    }
  )
  return result.data
}

// =============================================================================
// BOOKING DRAFTS (AI Assistant)
// =============================================================================

export interface BookingDraft {
  id: string
  tenant_id: string
  original_booking_id?: string
  contact_id: string
  contact_name: string
  contact_phone?: string
  contact_email?: string
  action_type: 'create' | 'reschedule' | 'cancel'
  proposed_date?: number
  proposed_time?: string
  service_type?: string
  staff_id?: string
  duration_minutes: number
  ai_confidence: number
  ai_reasoning: string
  source_message: string
  source_channel: string
  detected_intent: string
  detected_entities?: Record<string, any>
  availability_checked: boolean
  is_available: boolean
  alternative_slots?: Array<{ date: number; time: string }>
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  reviewed_by?: string
  reviewed_at?: number
  review_notes?: string
  created_at: number
  created_by: string
  applied_at?: number
}

export async function getBookingDrafts(): Promise<BookingDraft[]> {
  const result = await apiRequest<{ success: boolean; data: BookingDraft[] }>('/api/booking-drafts')
  return result.data || []
}

export async function approveDraft(draftId: string): Promise<void> {
  await apiRequest(`/api/booking-drafts/${draftId}/approve`, {
    method: 'POST',
  })
}

export async function rejectDraft(draftId: string, notes?: string): Promise<void> {
  await apiRequest(`/api/booking-drafts/${draftId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

// ==================== User Preferences ====================

export interface UserPreferences {
  id: string
  tenant_id: string
  user_id: string

  // UI Preferences
  theme?: 'light' | 'dark' | 'auto'
  sidebar_collapsed?: boolean
  default_view?: string

  // AI Assistant Preferences
  ai_window_position?: { x: number; y: number }
  ai_window_size?: { width: number; height: number }
  ai_window_docked?: boolean
  ai_quick_access_enabled?: boolean
  ai_auto_suggestions?: boolean
  ai_temperature?: number
  ai_context_length?: 'short' | 'medium' | 'long'

  // Notifications Preferences
  desktop_notifications?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  notification_sound?: boolean
  notification_types?: string[]

  // Dashboard Preferences
  dashboard_widgets?: any[]
  dashboard_layout?: 'grid' | 'list' | 'compact'

  // Contact/Pipeline Preferences
  default_pipeline_id?: string
  default_contact_view?: 'card' | 'table' | 'kanban'
  contacts_per_page?: number
  show_archived_contacts?: boolean

  // Calendar Preferences
  calendar_view?: 'day' | 'week' | 'month' | 'agenda'
  calendar_start_time?: string
  calendar_end_time?: string
  calendar_slot_duration?: number
  calendar_show_weekends?: boolean

  // Messages Preferences
  message_preview?: boolean
  message_group_by?: 'contact' | 'channel' | 'date'
  message_auto_archive?: boolean

  // Table/List Preferences
  visible_columns?: Record<string, string[]>
  column_order?: Record<string, string[]>
  sort_preferences?: Record<string, { field: string; direction: 'asc' | 'desc' }>

  // Keyboard Shortcuts
  keyboard_shortcuts_enabled?: boolean
  custom_shortcuts?: Record<string, string>

  // Language & Region
  language?: string
  timezone?: string
  date_format?: string
  time_format?: '12h' | '24h'
  currency?: string

  // Accessibility
  high_contrast?: boolean
  reduce_motion?: boolean
  text_size?: 'small' | 'medium' | 'large' | 'x-large'
  screen_reader_mode?: boolean

  // Advanced
  debug_mode?: boolean
  beta_features?: boolean
  analytics_enabled?: boolean

  // Metadata
  created_at: number
  updated_at: number
  last_synced_at?: number
}

export interface PreferenceHistory {
  id: string
  tenant_id: string
  user_id: string
  preference_key: string
  old_value: string | null
  new_value: string | null
  changed_at: number
  changed_from: 'user' | 'admin' | 'system'
}

export async function getPreferences(): Promise<UserPreferences> {
  const result = await apiRequest<{ success: boolean; data: UserPreferences }>('/api/preferences')
  return result.data
}

export async function updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
  const result = await apiRequest<{ success: boolean; data: UserPreferences }>('/api/preferences', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return result.data
}

export async function resetPreferences(): Promise<UserPreferences> {
  const result = await apiRequest<{ success: boolean; data: UserPreferences }>('/api/preferences/reset', {
    method: 'POST',
  })
  return result.data
}

export async function getPreferenceHistory(): Promise<PreferenceHistory[]> {
  const result = await apiRequest<{ success: boolean; data: PreferenceHistory[] }>('/api/preferences/history')
  return result.data
}

export async function exportPreferences(): Promise<Blob> {
  const response = await fetch('/api/preferences/export')
  return await response.blob()
}

export async function importPreferences(preferencesJson: string): Promise<UserPreferences> {
  const result = await apiRequest<{ success: boolean; data: UserPreferences }>('/api/preferences/import', {
    method: 'POST',
    body: preferencesJson,
  })
  return result.data
}
