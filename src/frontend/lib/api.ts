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
