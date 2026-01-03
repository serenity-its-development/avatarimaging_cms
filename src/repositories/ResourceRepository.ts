/**
 * ResourceRepository - D1 Implementation
 * Handles resources, types, subtypes, roles, and role assignments
 */

import type { D1Database } from '../types/env'
import type {
  Resource,
  ResourceType,
  ResourceSubtype,
  ResourceRole,
  ResourceRoleAssignment,
  ResourceWithType,
  ResourceWithRoles,
  CreateResourceInput,
  UpdateResourceInput,
  ReservationMode
} from '../types/resources'
import { generateId } from '../utils/id'

export interface ListResourcesParams {
  tenant_id?: string
  resource_type_id?: string
  resource_subtype_id?: string
  parent_resource_id?: string | null
  is_active?: boolean
  staff_user_id?: string
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export class D1ResourceRepository {
  constructor(private db: D1Database) {}

  // =====================================================================
  // RESOURCE TYPES
  // =====================================================================

  async getResourceTypes(includeInactive = false): Promise<ResourceType[]> {
    const query = includeInactive
      ? 'SELECT * FROM resource_types ORDER BY sort_order'
      : 'SELECT * FROM resource_types WHERE is_active = TRUE ORDER BY sort_order'

    const rows = await this.db.prepare(query).all()
    return rows.results ? rows.results.map(row => this.mapResourceType(row)) : []
  }

  async getResourceType(id: string): Promise<ResourceType | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_types WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapResourceType(row) : null
  }

  async getResourceTypeByCode(code: string): Promise<ResourceType | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_types WHERE code = ?')
      .bind(code)
      .first()
    return row ? this.mapResourceType(row) : null
  }

  // =====================================================================
  // RESOURCE SUBTYPES
  // =====================================================================

  async getResourceSubtypes(resourceTypeId?: string, includeInactive = false): Promise<ResourceSubtype[]> {
    let query = 'SELECT * FROM resource_subtypes'
    const conditions: string[] = []
    const values: any[] = []

    if (!includeInactive) {
      conditions.push('is_active = TRUE')
    }
    if (resourceTypeId) {
      conditions.push('resource_type_id = ?')
      values.push(resourceTypeId)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    query += ' ORDER BY name'

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapResourceSubtype(row)) : []
  }

  async getResourceSubtype(id: string): Promise<ResourceSubtype | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_subtypes WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapResourceSubtype(row) : null
  }

  async getResourceSubtypeByCode(typeId: string, code: string): Promise<ResourceSubtype | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_subtypes WHERE resource_type_id = ? AND code = ?')
      .bind(typeId, code)
      .first()
    return row ? this.mapResourceSubtype(row) : null
  }

  // =====================================================================
  // RESOURCES
  // =====================================================================

  async createResource(data: CreateResourceInput): Promise<Resource> {
    const now = Date.now()
    const id = generateId('resource')

    const resource: Resource = {
      id,
      resource_type_id: data.resource_type_id,
      resource_subtype_id: data.resource_subtype_id,
      name: data.name,
      description: data.description || null,
      default_reservation_mode: data.default_reservation_mode || 'exclusive',
      max_concurrent_bookings: data.max_concurrent_bookings || 1,
      parent_resource_id: data.parent_resource_id || null,
      is_consumable: data.is_consumable || false,
      quantity_on_hand: data.quantity_on_hand ?? null,
      quantity_threshold: data.quantity_threshold ?? null,
      staff_user_id: data.staff_user_id || null,
      stored_in_resource_id: data.stored_in_resource_id || null,
      requires_resource_id: data.requires_resource_id || null,
      metadata: data.metadata || {},
      tenant_id: data.tenant_id || null,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO resources (
          id, resource_type_id, resource_subtype_id, name, description,
          default_reservation_mode, max_concurrent_bookings, parent_resource_id,
          is_consumable, quantity_on_hand, quantity_threshold, staff_user_id,
          stored_in_resource_id, requires_resource_id, metadata, tenant_id,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        resource.resource_type_id,
        resource.resource_subtype_id,
        resource.name,
        resource.description,
        resource.default_reservation_mode,
        resource.max_concurrent_bookings,
        resource.parent_resource_id,
        resource.is_consumable ? 1 : 0,
        resource.quantity_on_hand,
        resource.quantity_threshold,
        resource.staff_user_id,
        resource.stored_in_resource_id,
        resource.requires_resource_id,
        JSON.stringify(resource.metadata),
        resource.tenant_id,
        1,
        resource.created_at,
        resource.updated_at
      )
      .run()

    // Assign roles if provided
    if (data.role_ids && data.role_ids.length > 0) {
      for (let i = 0; i < data.role_ids.length; i++) {
        await this.assignRole(id, data.role_ids[i], i)
      }
    }

    return resource
  }

  async updateResource(id: string, data: UpdateResourceInput): Promise<Resource> {
    const existing = await this.getResource(id)
    if (!existing) {
      throw new Error(`Resource not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.default_reservation_mode !== undefined) {
      updates.push('default_reservation_mode = ?')
      values.push(data.default_reservation_mode)
    }
    if (data.max_concurrent_bookings !== undefined) {
      updates.push('max_concurrent_bookings = ?')
      values.push(data.max_concurrent_bookings)
    }
    if (data.parent_resource_id !== undefined) {
      updates.push('parent_resource_id = ?')
      values.push(data.parent_resource_id)
    }
    if (data.is_consumable !== undefined) {
      updates.push('is_consumable = ?')
      values.push(data.is_consumable ? 1 : 0)
    }
    if (data.quantity_on_hand !== undefined) {
      updates.push('quantity_on_hand = ?')
      values.push(data.quantity_on_hand)
    }
    if (data.quantity_threshold !== undefined) {
      updates.push('quantity_threshold = ?')
      values.push(data.quantity_threshold)
    }
    if (data.stored_in_resource_id !== undefined) {
      updates.push('stored_in_resource_id = ?')
      values.push(data.stored_in_resource_id)
    }
    if (data.requires_resource_id !== undefined) {
      updates.push('requires_resource_id = ?')
      values.push(data.requires_resource_id)
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?')
      values.push(JSON.stringify(data.metadata))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    if (updates.length > 1) {
      await this.db
        .prepare(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()
    }

    // Update roles if provided
    if (data.role_ids !== undefined) {
      // Remove existing assignments
      await this.db
        .prepare('DELETE FROM resource_role_assignments WHERE resource_id = ?')
        .bind(id)
        .run()

      // Add new assignments
      for (let i = 0; i < data.role_ids.length; i++) {
        await this.assignRole(id, data.role_ids[i], i)
      }
    }

    return (await this.getResource(id)) as Resource
  }

  async deleteResource(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM resources WHERE id = ?').bind(id).run()
  }

  async getResource(id: string): Promise<Resource | null> {
    const row = await this.db
      .prepare('SELECT * FROM resources WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapResource(row) : null
  }

  async getResourceWithType(id: string): Promise<ResourceWithType | null> {
    const row = await this.db
      .prepare(`
        SELECT r.*,
               rt.id as rt_id, rt.code as rt_code, rt.name as rt_name, rt.description as rt_description,
               rt.icon as rt_icon, rt.sort_order as rt_sort_order, rt.is_system as rt_is_system,
               rt.is_active as rt_is_active, rt.created_at as rt_created_at, rt.updated_at as rt_updated_at,
               rs.id as rs_id, rs.code as rs_code, rs.name as rs_name, rs.description as rs_description,
               rs.metadata_schema as rs_metadata_schema, rs.is_active as rs_is_active,
               rs.created_at as rs_created_at, rs.updated_at as rs_updated_at
        FROM resources r
        LEFT JOIN resource_types rt ON r.resource_type_id = rt.id
        LEFT JOIN resource_subtypes rs ON r.resource_subtype_id = rs.id
        WHERE r.id = ?
      `)
      .bind(id)
      .first()

    if (!row) return null

    const resource = this.mapResource(row) as ResourceWithType
    if (row.rt_id) {
      resource.resource_type = {
        id: row.rt_id as string,
        code: row.rt_code as string,
        name: row.rt_name as string,
        description: row.rt_description as string | null,
        icon: row.rt_icon as string | null,
        sort_order: row.rt_sort_order as number,
        is_system: Boolean(row.rt_is_system),
        is_active: Boolean(row.rt_is_active),
        created_at: row.rt_created_at as number,
        updated_at: row.rt_updated_at as number
      }
    }
    if (row.rs_id) {
      resource.resource_subtype = {
        id: row.rs_id as string,
        resource_type_id: row.resource_type_id as string,
        code: row.rs_code as string,
        name: row.rs_name as string,
        description: row.rs_description as string | null,
        metadata_schema: row.rs_metadata_schema ? JSON.parse(row.rs_metadata_schema as string) : {},
        is_active: Boolean(row.rs_is_active),
        created_at: row.rs_created_at as number,
        updated_at: row.rs_updated_at as number
      }
    }

    return resource
  }

  async listResources(params: ListResourcesParams): Promise<PaginatedResult<Resource>> {
    const { limit = 50, offset = 0 } = params
    const where: string[] = []
    const values: any[] = []

    if (params.tenant_id) {
      where.push('tenant_id = ?')
      values.push(params.tenant_id)
    }
    if (params.resource_type_id) {
      where.push('resource_type_id = ?')
      values.push(params.resource_type_id)
    }
    if (params.resource_subtype_id) {
      where.push('resource_subtype_id = ?')
      values.push(params.resource_subtype_id)
    }
    if (params.parent_resource_id !== undefined) {
      if (params.parent_resource_id === null) {
        where.push('parent_resource_id IS NULL')
      } else {
        where.push('parent_resource_id = ?')
        values.push(params.parent_resource_id)
      }
    }
    if (params.is_active !== undefined) {
      where.push('is_active = ?')
      values.push(params.is_active ? 1 : 0)
    }
    if (params.staff_user_id) {
      where.push('staff_user_id = ?')
      values.push(params.staff_user_id)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resources ${whereClause}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM resources ${whereClause}
        ORDER BY name
        LIMIT ? OFFSET ?
      `)
      .bind(...values, limit, offset)
      .all()

    const data = rows.results ? rows.results.map(row => this.mapResource(row)) : []

    return {
      data,
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  }

  async getResourcesByType(typeCode: string, tenantId?: string): Promise<Resource[]> {
    let query = `
      SELECT r.* FROM resources r
      JOIN resource_types rt ON r.resource_type_id = rt.id
      WHERE rt.code = ? AND r.is_active = TRUE
    `
    const values: any[] = [typeCode]

    if (tenantId) {
      query += ' AND r.tenant_id = ?'
      values.push(tenantId)
    }

    query += ' ORDER BY r.name'

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapResource(row)) : []
  }

  async getChildResources(parentId: string): Promise<Resource[]> {
    const rows = await this.db
      .prepare('SELECT * FROM resources WHERE parent_resource_id = ? AND is_active = TRUE ORDER BY name')
      .bind(parentId)
      .all()
    return rows.results ? rows.results.map(row => this.mapResource(row)) : []
  }

  async getResourceByStaffUser(staffUserId: string): Promise<Resource | null> {
    const row = await this.db
      .prepare('SELECT * FROM resources WHERE staff_user_id = ?')
      .bind(staffUserId)
      .first()
    return row ? this.mapResource(row) : null
  }

  // =====================================================================
  // RESOURCE ROLES
  // =====================================================================

  async getRoles(resourceTypeId?: string, includeInactive = false): Promise<ResourceRole[]> {
    let query = 'SELECT * FROM resource_roles'
    const conditions: string[] = []
    const values: any[] = []

    if (!includeInactive) {
      conditions.push('is_active = TRUE')
    }
    if (resourceTypeId) {
      conditions.push('resource_type_id = ?')
      values.push(resourceTypeId)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    query += ' ORDER BY name'

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapRole(row)) : []
  }

  async getRole(id: string): Promise<ResourceRole | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_roles WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapRole(row) : null
  }

  async getRoleByCode(code: string): Promise<ResourceRole | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_roles WHERE code = ?')
      .bind(code)
      .first()
    return row ? this.mapRole(row) : null
  }

  // =====================================================================
  // ROLE ASSIGNMENTS
  // =====================================================================

  async assignRole(resourceId: string, roleId: string, priority = 0): Promise<ResourceRoleAssignment> {
    const id = generateId('roleassign')
    const now = Date.now()

    await this.db
      .prepare(`
        INSERT INTO resource_role_assignments (id, resource_id, role_id, priority, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(id, resourceId, roleId, priority, now)
      .run()

    return { id, resource_id: resourceId, role_id: roleId, priority, created_at: now }
  }

  async unassignRole(resourceId: string, roleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM resource_role_assignments WHERE resource_id = ? AND role_id = ?')
      .bind(resourceId, roleId)
      .run()
  }

  async getResourceRoles(resourceId: string): Promise<ResourceRole[]> {
    const rows = await this.db
      .prepare(`
        SELECT rr.* FROM resource_roles rr
        JOIN resource_role_assignments rra ON rr.id = rra.role_id
        WHERE rra.resource_id = ?
        ORDER BY rra.priority
      `)
      .bind(resourceId)
      .all()
    return rows.results ? rows.results.map(row => this.mapRole(row)) : []
  }

  async getResourcesForRole(roleId: string, tenantId?: string): Promise<Resource[]> {
    let query = `
      SELECT r.* FROM resources r
      JOIN resource_role_assignments rra ON r.id = rra.resource_id
      WHERE rra.role_id = ? AND r.is_active = TRUE
    `
    const values: any[] = [roleId]

    if (tenantId) {
      query += ' AND r.tenant_id = ?'
      values.push(tenantId)
    }

    query += ' ORDER BY rra.priority, r.name'

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapResource(row)) : []
  }

  async getResourceWithRoles(id: string): Promise<ResourceWithRoles | null> {
    const resource = await this.getResource(id)
    if (!resource) return null

    const roles = await this.getResourceRoles(id)
    return { ...resource, roles }
  }

  // =====================================================================
  // INVENTORY
  // =====================================================================

  async updateInventory(resourceId: string, quantityChange: number): Promise<number> {
    const resource = await this.getResource(resourceId)
    if (!resource || !resource.is_consumable) {
      throw new Error('Resource is not a consumable')
    }

    const currentQty = resource.quantity_on_hand || 0
    const newQty = currentQty + quantityChange

    await this.db
      .prepare('UPDATE resources SET quantity_on_hand = ?, updated_at = ? WHERE id = ?')
      .bind(newQty, Date.now(), resourceId)
      .run()

    return newQty
  }

  async getLowStockResources(tenantId?: string): Promise<Resource[]> {
    let query = `
      SELECT * FROM resources
      WHERE is_consumable = TRUE
        AND is_active = TRUE
        AND quantity_on_hand IS NOT NULL
        AND quantity_threshold IS NOT NULL
        AND quantity_on_hand <= quantity_threshold
    `
    const values: any[] = []

    if (tenantId) {
      query += ' AND tenant_id = ?'
      values.push(tenantId)
    }

    query += ' ORDER BY (quantity_on_hand - quantity_threshold)'

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapResource(row)) : []
  }

  // =====================================================================
  // MAPPERS
  // =====================================================================

  private mapResourceType(row: any): ResourceType {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      sort_order: row.sort_order,
      is_system: Boolean(row.is_system),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapResourceSubtype(row: any): ResourceSubtype {
    return {
      id: row.id,
      resource_type_id: row.resource_type_id,
      code: row.code,
      name: row.name,
      description: row.description,
      metadata_schema: row.metadata_schema ? JSON.parse(row.metadata_schema) : {},
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapResource(row: any): Resource {
    return {
      id: row.id,
      resource_type_id: row.resource_type_id,
      resource_subtype_id: row.resource_subtype_id,
      name: row.name,
      description: row.description,
      default_reservation_mode: row.default_reservation_mode as ReservationMode,
      max_concurrent_bookings: row.max_concurrent_bookings,
      parent_resource_id: row.parent_resource_id,
      is_consumable: Boolean(row.is_consumable),
      quantity_on_hand: row.quantity_on_hand,
      quantity_threshold: row.quantity_threshold,
      staff_user_id: row.staff_user_id,
      stored_in_resource_id: row.stored_in_resource_id,
      requires_resource_id: row.requires_resource_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      tenant_id: row.tenant_id,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapRole(row: any): ResourceRole {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      resource_type_id: row.resource_type_id,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
