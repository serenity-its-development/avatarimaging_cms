/**
 * API Client for Avatar Imaging CRM
 * Connects to deployed Cloudflare Worker backend
 */

// API Base URL - Update based on environment
const API_BASE_URL = import.meta.env.PROD
  ? 'https://avatarimaging_cms.mona-08d.workers.dev'
  : '/api' // Proxied in dev via Vite

/**
 * Generic API request handler with error handling
 */
async function apiRequest<T>(
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
  return apiRequest(`/api/contacts${queryString ? `?${queryString}` : ''}`)
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
  return apiRequest(`/api/tasks${queryString ? `?${queryString}` : ''}`)
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
