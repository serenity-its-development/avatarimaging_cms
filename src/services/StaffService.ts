import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import { generateId } from '../utils/id'

// =============================================================================
// TYPES
// =============================================================================

export interface Role {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  permissions: string[] // Array of permission strings
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
  role?: Role // Populated in queries
  avatar_url?: string
  bio?: string
  specialties: string[] // Array of specialty areas
  availability: Record<string, string> // Day -> time range mapping
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
  staff?: Staff // Populated in queries
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

// =============================================================================
// STAFF SERVICE
// =============================================================================

export class StaffService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer
  ) {}

  // ===========================================================================
  // ROLES
  // ===========================================================================

  async listRoles(includeInactive = false): Promise<Role[]> {
    const query = includeInactive
      ? 'SELECT * FROM roles ORDER BY name ASC'
      : 'SELECT * FROM roles WHERE is_active = 1 ORDER BY name ASC'

    const result = await this.db.raw(query)
    const rows = result.results || []
    return rows.map((role: any) => ({
      ...role,
      permissions: this.parseJSON(role.permissions as any, [])
    }))
  }

  async getRoleById(id: string): Promise<Role | null> {
    const result = await this.db.raw('SELECT * FROM roles WHERE id = ?', [id])
    const rows = result.results || []
    if (rows.length === 0) return null

    return {
      ...rows[0],
      permissions: this.parseJSON(rows[0].permissions as any, [])
    }
  }

  async getRoleBySlug(slug: string): Promise<Role | null> {
    const result = await this.db.raw('SELECT * FROM roles WHERE slug = ?', [slug])
    const rows = result.results || []
    if (rows.length === 0) return null

    return {
      ...rows[0],
      permissions: this.parseJSON(rows[0].permissions as any, [])
    }
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    const now = Date.now()
    const role: Role = {
      id: generateId('role'),
      name: input.name,
      slug: input.slug,
      description: input.description,
      color: input.color,
      permissions: input.permissions,
      is_active: true,
      is_system: false,
      created_at: now,
      updated_at: now
    }

    await this.db.raw(
      `INSERT INTO roles (id, name, slug, description, color, permissions, is_active, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        role.id,
        role.name,
        role.slug,
        role.description,
        role.color,
        JSON.stringify(role.permissions),
        role.is_active ? 1 : 0,
        role.is_system ? 1 : 0,
        role.created_at,
        role.updated_at
      ]
    )

    return role
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    const existing = await this.getRoleById(id)
    if (!existing) throw new Error('Role not found')
    if (existing.is_system) throw new Error('Cannot modify system roles')

    const updates: string[] = []
    const params: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      params.push(input.name)
    }
    if (input.description !== undefined) {
      updates.push('description = ?')
      params.push(input.description)
    }
    if (input.color !== undefined) {
      updates.push('color = ?')
      params.push(input.color)
    }
    if (input.permissions !== undefined) {
      updates.push('permissions = ?')
      params.push(JSON.stringify(input.permissions))
    }
    if (input.is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(input.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await this.db.raw(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    return this.getRoleById(id) as Promise<Role>
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRoleById(id)
    if (!role) throw new Error('Role not found')
    if (role.is_system) throw new Error('Cannot delete system roles')

    // Check if any staff members have this role
    const staffCount = await this.db.raw<{ count: number }>(
      'SELECT COUNT(*) as count FROM staff WHERE role_id = ?',
      [id]
    )

    if (staffCount[0].count > 0) {
      throw new Error('Cannot delete role with active staff members')
    }

    await this.db.raw('DELETE FROM roles WHERE id = ?', [id])
  }

  // ===========================================================================
  // STAFF
  // ===========================================================================

  async listStaff(options?: {
    includeInactive?: boolean
    roleId?: string
    canBeAssigned?: boolean
  }): Promise<Staff[]> {
    let query = `
      SELECT s.*, r.name as role_name, r.slug as role_slug, r.color as role_color
      FROM staff s
      LEFT JOIN roles r ON s.role_id = r.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!options?.includeInactive) {
      query += ' AND s.is_active = TRUE'
    }

    if (options?.roleId) {
      query += ' AND s.role_id = ?'
      params.push(options.roleId)
    }

    if (options?.canBeAssigned !== undefined) {
      query += ' AND s.can_be_assigned = ?'
      params.push(options.canBeAssigned ? 1 : 0)
    }

    query += ' ORDER BY s.first_name ASC, s.last_name ASC'

    const result = await this.db.raw(query, params)
    const rows = result.results || []
    return rows.map((row: any) => this.mapStaffRow(row))
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const result = await this.db.raw(
      `SELECT s.*, r.name as role_name, r.slug as role_slug, r.color as role_color
       FROM staff s
       LEFT JOIN roles r ON s.role_id = r.id
       WHERE s.id = ?`,
      [id]
    )

    const rows = result.results || []
    if (rows.length === 0) return null
    return this.mapStaffRow(rows[0])
  }

  async getStaffByEmail(email: string): Promise<Staff | null> {
    const result = await this.db.raw(
      `SELECT s.*, r.name as role_name, r.slug as role_slug, r.color as role_color
       FROM staff s
       LEFT JOIN roles r ON s.role_id = r.id
       WHERE s.email = ?`,
      [email]
    )

    const rows = result.results || []

    if (rows.length === 0) return null
    return this.mapStaffRow(rows[0])
  }

  async createStaff(input: CreateStaffInput): Promise<Staff> {
    const now = Date.now()
    const staff: Staff = {
      id: generateId('staff'),
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      role_id: input.role_id,
      avatar_url: input.avatar_url,
      bio: input.bio,
      specialties: input.specialties || [],
      availability: input.availability || {},
      is_active: true,
      can_be_assigned: true,
      workload_capacity: input.workload_capacity || 10,
      current_workload: 0,
      hire_date: input.hire_date,
      created_at: now,
      updated_at: now
    }

    await this.db.raw(
      `INSERT INTO staff (id, email, first_name, last_name, phone, role_id, avatar_url, bio,
        specialties, availability, is_active, can_be_assigned, workload_capacity, current_workload,
        hire_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staff.id,
        staff.email,
        staff.first_name,
        staff.last_name,
        staff.phone,
        staff.role_id,
        staff.avatar_url,
        staff.bio,
        JSON.stringify(staff.specialties),
        JSON.stringify(staff.availability),
        staff.is_active ? 1 : 0,
        staff.can_be_assigned ? 1 : 0,
        staff.workload_capacity,
        staff.current_workload,
        staff.hire_date,
        staff.created_at,
        staff.updated_at
      ]
    )

    return this.getStaffById(staff.id) as Promise<Staff>
  }

  async updateStaff(id: string, input: UpdateStaffInput): Promise<Staff> {
    const existing = await this.getStaffById(id)
    if (!existing) throw new Error('Staff member not found')

    const updates: string[] = []
    const params: any[] = []

    if (input.email !== undefined) {
      updates.push('email = ?')
      params.push(input.email)
    }
    if (input.first_name !== undefined) {
      updates.push('first_name = ?')
      params.push(input.first_name)
    }
    if (input.last_name !== undefined) {
      updates.push('last_name = ?')
      params.push(input.last_name)
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?')
      params.push(input.phone)
    }
    if (input.role_id !== undefined) {
      updates.push('role_id = ?')
      params.push(input.role_id)
    }
    if (input.avatar_url !== undefined) {
      updates.push('avatar_url = ?')
      params.push(input.avatar_url)
    }
    if (input.bio !== undefined) {
      updates.push('bio = ?')
      params.push(input.bio)
    }
    if (input.specialties !== undefined) {
      updates.push('specialties = ?')
      params.push(JSON.stringify(input.specialties))
    }
    if (input.availability !== undefined) {
      updates.push('availability = ?')
      params.push(JSON.stringify(input.availability))
    }
    if (input.is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(input.is_active ? 1 : 0)
    }
    if (input.can_be_assigned !== undefined) {
      updates.push('can_be_assigned = ?')
      params.push(input.can_be_assigned ? 1 : 0)
    }
    if (input.workload_capacity !== undefined) {
      updates.push('workload_capacity = ?')
      params.push(input.workload_capacity)
    }

    updates.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await this.db.raw(
      `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    return this.getStaffById(id) as Promise<Staff>
  }

  async deleteStaff(id: string): Promise<void> {
    const staff = await this.getStaffById(id)
    if (!staff) throw new Error('Staff member not found')

    // Deactivate instead of delete to preserve historical data
    await this.updateStaff(id, { is_active: false, can_be_assigned: false })
  }

  // ===========================================================================
  // STAFF ASSIGNMENTS
  // ===========================================================================

  async assignStaff(input: AssignStaffInput): Promise<StaffAssignment> {
    const now = Date.now()

    // Check if staff member can be assigned
    const staff = await this.getStaffById(input.staff_id)
    if (!staff) throw new Error('Staff member not found')
    if (!staff.can_be_assigned) throw new Error('Staff member cannot be assigned')

    // Check workload capacity
    if (staff.current_workload >= staff.workload_capacity) {
      console.warn(`Staff ${staff.id} at capacity (${staff.current_workload}/${staff.workload_capacity})`)
    }

    const assignment: StaffAssignment = {
      id: generateId('assignment'),
      contact_id: input.contact_id,
      staff_id: input.staff_id,
      assignment_type: input.assignment_type,
      assigned_by: input.assigned_by,
      assigned_at: now,
      notes: input.notes,
      is_active: true,
      created_at: now
    }

    await this.db.raw(
      `INSERT OR REPLACE INTO staff_assignments (id, contact_id, staff_id, assignment_type, assigned_by, assigned_at, notes, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.id,
        assignment.contact_id,
        assignment.staff_id,
        assignment.assignment_type,
        assignment.assigned_by,
        assignment.assigned_at,
        assignment.notes,
        assignment.is_active ? 1 : 0,
        assignment.created_at
      ]
    )

    // Update staff workload
    await this.updateWorkload(input.staff_id)

    return assignment
  }

  async getContactAssignments(contactId: string): Promise<StaffAssignment[]> {
    const result = await this.db.raw(
      `SELECT sa.*, s.first_name, s.last_name, s.email, s.role_id, s.avatar_url,
              r.name as role_name, r.color as role_color
       FROM staff_assignments sa
       LEFT JOIN staff s ON sa.staff_id = s.id
       LEFT JOIN roles r ON s.role_id = r.id
       WHERE sa.contact_id = ? AND sa.is_active = TRUE
       ORDER BY
         CASE sa.assignment_type
           WHEN 'primary' THEN 1
           WHEN 'secondary' THEN 2
           WHEN 'specialist' THEN 3
           WHEN 'consultant' THEN 4
           ELSE 5
         END`,
      [contactId]
    )

    const rows = result.results || []
    return rows.map((row: any) => ({
      id: row.id,
      contact_id: row.contact_id,
      staff_id: row.staff_id,
      assignment_type: row.assignment_type,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      notes: row.notes,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      staff: row.first_name ? {
        id: row.staff_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role_id: row.role_id,
        avatar_url: row.avatar_url,
        specialties: [],
        availability: {},
        is_active: true,
        can_be_assigned: true,
        workload_capacity: 0,
        current_workload: 0,
        created_at: 0,
        updated_at: 0,
        role: row.role_name ? {
          id: row.role_id,
          name: row.role_name,
          slug: '',
          color: row.role_color,
          permissions: [],
          is_active: true,
          is_system: false,
          created_at: 0,
          updated_at: 0
        } : undefined
      } : undefined
    }))
  }

  async getStaffAssignments(staffId: string): Promise<StaffAssignment[]> {
    const result = await this.db.raw(
      `SELECT * FROM staff_assignments
       WHERE staff_id = ? AND is_active = TRUE
       ORDER BY assigned_at DESC`,
      [staffId]
    )

    const rows = result.results || []
    return rows.map((row: any) => ({
      id: row.id,
      contact_id: row.contact_id,
      staff_id: row.staff_id,
      assignment_type: row.assignment_type,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      notes: row.notes,
      is_active: Boolean(row.is_active),
      created_at: row.created_at
    }))
  }

  async unassignStaff(contactId: string, staffId: string): Promise<void> {
    await this.db.raw(
      'UPDATE staff_assignments SET is_active = FALSE WHERE contact_id = ? AND staff_id = ?',
      [contactId, staffId]
    )

    // Update staff workload
    await this.updateWorkload(staffId)
  }

  // ===========================================================================
  // AI STAFF SUGGESTIONS
  // ===========================================================================

  async suggestStaff(contactData: {
    name: string
    current_pipeline?: string
    current_stage?: string
    source?: string
    data?: Record<string, any>
  }, assignmentType: StaffAssignment['assignment_type']): Promise<AIStaffSuggestion[]> {
    // Get all available staff
    const availableStaff = await this.listStaff({ canBeAssigned: true })

    if (availableStaff.length === 0) {
      return []
    }

    // Build prompt for AI
    const prompt = this.buildStaffSuggestionPrompt(contactData, assignmentType, availableStaff)

    try {
      const response = await this.ai.raw<{ suggestions: AIStaffSuggestion[] }>({
        model: '@cf/meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent medical practice staff assignment assistant. Analyze patient data and suggest the best staff members for assignment. Return valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800
      })

      return this.parseAIStaffResponse(response.result.response)
    } catch (error) {
      console.error('AI staff suggestion error:', error)
      // Fallback: suggest staff with lowest workload
      return this.fallbackStaffSuggestion(availableStaff, assignmentType)
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private async updateWorkload(staffId: string): Promise<void> {
    const assignments = await this.getStaffAssignments(staffId)
    const workload = assignments.filter(a => a.is_active).length

    await this.db.raw(
      'UPDATE staff SET current_workload = ? WHERE id = ?',
      [workload, staffId]
    )
  }

  private mapStaffRow(row: any): Staff {
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      role_id: row.role_id,
      avatar_url: row.avatar_url,
      bio: row.bio,
      specialties: this.parseJSON(row.specialties, []),
      availability: this.parseJSON(row.availability, {}),
      is_active: Boolean(row.is_active),
      can_be_assigned: Boolean(row.can_be_assigned),
      workload_capacity: row.workload_capacity,
      current_workload: row.current_workload,
      hire_date: row.hire_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role: row.role_name ? {
        id: row.role_id,
        name: row.role_name,
        slug: row.role_slug,
        color: row.role_color,
        permissions: [],
        is_active: true,
        is_system: false,
        created_at: 0,
        updated_at: 0
      } : undefined
    }
  }

  private parseJSON<T>(value: any, defaultValue: T): T {
    if (!value) return defaultValue
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return defaultValue
    }
  }

  private buildStaffSuggestionPrompt(
    contactData: any,
    assignmentType: string,
    staff: Staff[]
  ): string {
    return `Analyze this patient and suggest the best staff member(s) for ${assignmentType} assignment.

PATIENT DATA:
- Name: ${contactData.name}
- Pipeline: ${contactData.current_pipeline || 'Unknown'}
- Stage: ${contactData.current_stage || 'Unknown'}
- Source: ${contactData.source || 'Unknown'}
${contactData.data ? `- Additional: ${JSON.stringify(contactData.data)}` : ''}

AVAILABLE STAFF:
${staff.map((s, i) => `
${i + 1}. ${s.first_name} ${s.last_name}
   - ID: ${s.id}
   - Role: ${s.role?.name || 'Unknown'}
   - Specialties: ${s.specialties.join(', ') || 'None'}
   - Workload: ${s.current_workload}/${s.workload_capacity}
   - Available: ${Object.keys(s.availability).join(', ') || 'Unknown'}
`).join('')}

Return JSON array with top 3 suggestions (or fewer if not enough good matches):
{
  "suggestions": [
    {
      "staff_id": "staff_xxx",
      "staff_name": "First Last",
      "role": "Role Name",
      "confidence": 0.95,
      "reasoning": "Why this person is a good match",
      "estimated_workload": 5,
      "specialties_match": ["matching specialty 1", "matching specialty 2"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no extra text.`
  }

  private parseAIStaffResponse(response: string): AIStaffSuggestion[] {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }

      const parsed = JSON.parse(cleaned)
      return parsed.suggestions || []
    } catch (error) {
      console.error('Failed to parse AI staff response:', error, 'Response:', response)
      return []
    }
  }

  private fallbackStaffSuggestion(staff: Staff[], assignmentType: string): AIStaffSuggestion[] {
    // Sort by workload (ascending)
    const sorted = [...staff].sort((a, b) => {
      const aLoad = a.current_workload / a.workload_capacity
      const bLoad = b.current_workload / b.workload_capacity
      return aLoad - bLoad
    })

    // Return top 3
    return sorted.slice(0, 3).map(s => ({
      staff_id: s.id,
      staff_name: `${s.first_name} ${s.last_name}`,
      role: s.role?.name || 'Unknown',
      confidence: 0.5,
      reasoning: 'Selected based on current workload availability',
      estimated_workload: s.current_workload,
      specialties_match: []
    }))
  }
}
