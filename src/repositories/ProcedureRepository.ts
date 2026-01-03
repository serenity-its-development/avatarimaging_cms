/**
 * ProcedureRepository - D1 Implementation
 * Handles procedures, compositions, and requirements
 */

import type { D1Database } from '../types/env'
import type {
  Procedure,
  ProcedureComposition,
  ProcedureRequirement,
  ProcedureType,
  ProcedureWithDetails,
  ProcedureRequirementWithRole,
  CreateProcedureInput,
  CreateProcedureRequirementInput,
  ResourceRole
} from '../types/resources'
import { generateId } from '../utils/id'

export interface ListProceduresParams {
  tenant_id?: string
  procedure_type?: ProcedureType
  is_active?: boolean
  limit?: number
  offset?: number
}

export class D1ProcedureRepository {
  constructor(private db: D1Database) {}

  // =====================================================================
  // PROCEDURES
  // =====================================================================

  async create(data: CreateProcedureInput): Promise<Procedure> {
    const now = Date.now()
    const id = generateId('procedure')

    const procedure: Procedure = {
      id,
      code: data.code,
      name: data.name,
      description: data.description || null,
      procedure_type: data.procedure_type,
      duration_minutes: data.duration_minutes ?? null,
      buffer_before_minutes: data.buffer_before_minutes || 0,
      buffer_after_minutes: data.buffer_after_minutes || 0,
      color: data.color || null,
      tenant_id: data.tenant_id || null,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO procedures (
          id, code, name, description, procedure_type, duration_minutes,
          buffer_before_minutes, buffer_after_minutes, color, tenant_id,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        procedure.code,
        procedure.name,
        procedure.description,
        procedure.procedure_type,
        procedure.duration_minutes,
        procedure.buffer_before_minutes,
        procedure.buffer_after_minutes,
        procedure.color,
        procedure.tenant_id,
        1,
        procedure.created_at,
        procedure.updated_at
      )
      .run()

    // Add requirements if provided
    if (data.requirements && data.requirements.length > 0) {
      for (const req of data.requirements) {
        await this.createRequirement(id, req)
      }
    }

    // Add children if composite
    if (data.children && data.children.length > 0) {
      for (const child of data.children) {
        await this.addChild(id, child.procedure_id, child.sequence_order, child.gap_after_minutes)
      }
    }

    return procedure
  }

  async update(id: string, data: Partial<CreateProcedureInput>): Promise<Procedure> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Procedure not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.code !== undefined) {
      updates.push('code = ?')
      values.push(data.code)
    }
    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.duration_minutes !== undefined) {
      updates.push('duration_minutes = ?')
      values.push(data.duration_minutes)
    }
    if (data.buffer_before_minutes !== undefined) {
      updates.push('buffer_before_minutes = ?')
      values.push(data.buffer_before_minutes)
    }
    if (data.buffer_after_minutes !== undefined) {
      updates.push('buffer_after_minutes = ?')
      values.push(data.buffer_after_minutes)
    }
    if (data.color !== undefined) {
      updates.push('color = ?')
      values.push(data.color)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    if (updates.length > 1) {
      await this.db
        .prepare(`UPDATE procedures SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()
    }

    return (await this.get(id)) as Procedure
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM procedures WHERE id = ?').bind(id).run()
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db
      .prepare('UPDATE procedures SET is_active = ?, updated_at = ? WHERE id = ?')
      .bind(isActive ? 1 : 0, Date.now(), id)
      .run()
  }

  async get(id: string): Promise<Procedure | null> {
    const row = await this.db
      .prepare('SELECT * FROM procedures WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapProcedure(row) : null
  }

  async getByCode(code: string): Promise<Procedure | null> {
    const row = await this.db
      .prepare('SELECT * FROM procedures WHERE code = ?')
      .bind(code)
      .first()
    return row ? this.mapProcedure(row) : null
  }

  async list(params: ListProceduresParams = {}): Promise<Procedure[]> {
    const where: string[] = []
    const values: any[] = []

    if (params.tenant_id) {
      where.push('(tenant_id = ? OR tenant_id IS NULL)')
      values.push(params.tenant_id)
    }
    if (params.procedure_type) {
      where.push('procedure_type = ?')
      values.push(params.procedure_type)
    }
    if (params.is_active !== undefined) {
      where.push('is_active = ?')
      values.push(params.is_active ? 1 : 0)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    let query = `SELECT * FROM procedures ${whereClause} ORDER BY name`

    if (params.limit) {
      query += ` LIMIT ${params.limit}`
      if (params.offset) {
        query += ` OFFSET ${params.offset}`
      }
    }

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapProcedure(row)) : []
  }

  async getWithDetails(id: string): Promise<ProcedureWithDetails | null> {
    const procedure = await this.get(id)
    if (!procedure) return null

    const requirements = await this.getRequirementsWithRoles(id)

    let children: ProcedureWithDetails[] | undefined
    let totalDuration = procedure.duration_minutes || 0

    if (procedure.procedure_type === 'composite') {
      const compositions = await this.getChildren(id)
      children = []
      totalDuration = 0

      for (const comp of compositions) {
        const childProc = await this.getWithDetails(comp.child_procedure_id)
        if (childProc) {
          children.push(childProc)
          totalDuration += childProc.total_duration_minutes + comp.gap_after_minutes
        }
      }
    }

    return {
      ...procedure,
      requirements,
      children,
      total_duration_minutes: totalDuration + procedure.buffer_before_minutes + procedure.buffer_after_minutes
    }
  }

  // =====================================================================
  // PROCEDURE COMPOSITIONS
  // =====================================================================

  async addChild(parentId: string, childId: string, sequenceOrder: number, gapAfterMinutes = 0): Promise<ProcedureComposition> {
    const id = generateId('proccomp')
    const now = Date.now()

    await this.db
      .prepare(`
        INSERT INTO procedure_compositions (id, parent_procedure_id, child_procedure_id, sequence_order, gap_after_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(id, parentId, childId, sequenceOrder, gapAfterMinutes, now)
      .run()

    return {
      id,
      parent_procedure_id: parentId,
      child_procedure_id: childId,
      sequence_order: sequenceOrder,
      gap_after_minutes: gapAfterMinutes,
      created_at: now
    }
  }

  async removeChild(parentId: string, childId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM procedure_compositions WHERE parent_procedure_id = ? AND child_procedure_id = ?')
      .bind(parentId, childId)
      .run()
  }

  async getChildren(parentId: string): Promise<ProcedureComposition[]> {
    const rows = await this.db
      .prepare('SELECT * FROM procedure_compositions WHERE parent_procedure_id = ? ORDER BY sequence_order')
      .bind(parentId)
      .all()

    return rows.results ? rows.results.map(row => ({
      id: row.id as string,
      parent_procedure_id: row.parent_procedure_id as string,
      child_procedure_id: row.child_procedure_id as string,
      sequence_order: row.sequence_order as number,
      gap_after_minutes: row.gap_after_minutes as number,
      created_at: row.created_at as number
    })) : []
  }

  async updateChildOrder(parentId: string, childId: string, newOrder: number): Promise<void> {
    await this.db
      .prepare('UPDATE procedure_compositions SET sequence_order = ? WHERE parent_procedure_id = ? AND child_procedure_id = ?')
      .bind(newOrder, parentId, childId)
      .run()
  }

  // =====================================================================
  // PROCEDURE REQUIREMENTS
  // =====================================================================

  async createRequirement(procedureId: string, data: CreateProcedureRequirementInput): Promise<ProcedureRequirement> {
    const id = generateId('procreq')
    const now = Date.now()

    const requirement: ProcedureRequirement = {
      id,
      procedure_id: procedureId,
      role_id: data.role_id,
      quantity_min: data.quantity_min,
      quantity_max: data.quantity_max ?? null,
      is_required: data.is_required ?? true,
      offset_start_minutes: data.offset_start_minutes || 0,
      offset_end_minutes: data.offset_end_minutes ?? null,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO procedure_requirements (
          id, procedure_id, role_id, quantity_min, quantity_max,
          is_required, offset_start_minutes, offset_end_minutes, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        requirement.procedure_id,
        requirement.role_id,
        requirement.quantity_min,
        requirement.quantity_max,
        requirement.is_required ? 1 : 0,
        requirement.offset_start_minutes,
        requirement.offset_end_minutes,
        requirement.notes,
        requirement.created_at,
        requirement.updated_at
      )
      .run()

    return requirement
  }

  async updateRequirement(id: string, data: Partial<CreateProcedureRequirementInput>): Promise<ProcedureRequirement> {
    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.role_id !== undefined) {
      updates.push('role_id = ?')
      values.push(data.role_id)
    }
    if (data.quantity_min !== undefined) {
      updates.push('quantity_min = ?')
      values.push(data.quantity_min)
    }
    if (data.quantity_max !== undefined) {
      updates.push('quantity_max = ?')
      values.push(data.quantity_max)
    }
    if (data.is_required !== undefined) {
      updates.push('is_required = ?')
      values.push(data.is_required ? 1 : 0)
    }
    if (data.offset_start_minutes !== undefined) {
      updates.push('offset_start_minutes = ?')
      values.push(data.offset_start_minutes)
    }
    if (data.offset_end_minutes !== undefined) {
      updates.push('offset_end_minutes = ?')
      values.push(data.offset_end_minutes)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db
      .prepare(`UPDATE procedure_requirements SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.getRequirement(id)) as ProcedureRequirement
  }

  async deleteRequirement(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM procedure_requirements WHERE id = ?').bind(id).run()
  }

  async getRequirement(id: string): Promise<ProcedureRequirement | null> {
    const row = await this.db
      .prepare('SELECT * FROM procedure_requirements WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapRequirement(row) : null
  }

  async getRequirements(procedureId: string): Promise<ProcedureRequirement[]> {
    const rows = await this.db
      .prepare('SELECT * FROM procedure_requirements WHERE procedure_id = ? ORDER BY offset_start_minutes')
      .bind(procedureId)
      .all()
    return rows.results ? rows.results.map(row => this.mapRequirement(row)) : []
  }

  async getRequirementsWithRoles(procedureId: string): Promise<ProcedureRequirementWithRole[]> {
    const rows = await this.db
      .prepare(`
        SELECT pr.*, rr.code as role_code, rr.name as role_name, rr.description as role_description,
               rr.resource_type_id as role_resource_type_id, rr.is_active as role_is_active,
               rr.created_at as role_created_at, rr.updated_at as role_updated_at
        FROM procedure_requirements pr
        JOIN resource_roles rr ON pr.role_id = rr.id
        WHERE pr.procedure_id = ?
        ORDER BY pr.offset_start_minutes
      `)
      .bind(procedureId)
      .all()

    return rows.results ? rows.results.map(row => {
      const requirement = this.mapRequirement(row)
      const role: ResourceRole = {
        id: row.role_id as string,
        code: row.role_code as string,
        name: row.role_name as string,
        description: row.role_description as string | null,
        resource_type_id: row.role_resource_type_id as string,
        is_active: Boolean(row.role_is_active),
        created_at: row.role_created_at as number,
        updated_at: row.role_updated_at as number
      }
      return { ...requirement, role }
    }) : []
  }

  async deleteRequirementsForProcedure(procedureId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM procedure_requirements WHERE procedure_id = ?')
      .bind(procedureId)
      .run()
  }

  // =====================================================================
  // CALCULATED DURATION
  // =====================================================================

  async calculateTotalDuration(procedureId: string): Promise<number> {
    const procedure = await this.get(procedureId)
    if (!procedure) return 0

    if (procedure.procedure_type === 'atomic') {
      return (procedure.duration_minutes || 0) + procedure.buffer_before_minutes + procedure.buffer_after_minutes
    }

    // Composite - sum children
    const children = await this.getChildren(procedureId)
    let total = procedure.buffer_before_minutes + procedure.buffer_after_minutes

    for (const child of children) {
      total += await this.calculateTotalDuration(child.child_procedure_id)
      total += child.gap_after_minutes
    }

    return total
  }

  // =====================================================================
  // MAPPERS
  // =====================================================================

  private mapProcedure(row: any): Procedure {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      procedure_type: row.procedure_type as ProcedureType,
      duration_minutes: row.duration_minutes,
      buffer_before_minutes: row.buffer_before_minutes,
      buffer_after_minutes: row.buffer_after_minutes,
      color: row.color,
      tenant_id: row.tenant_id,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapRequirement(row: any): ProcedureRequirement {
    return {
      id: row.id,
      procedure_id: row.procedure_id,
      role_id: row.role_id,
      quantity_min: row.quantity_min,
      quantity_max: row.quantity_max,
      is_required: Boolean(row.is_required),
      offset_start_minutes: row.offset_start_minutes,
      offset_end_minutes: row.offset_end_minutes,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
