/**
 * ProcedureService - Business logic for procedures
 */

import { D1ProcedureRepository } from '../repositories/ProcedureRepository'
import { D1ResourceRepository } from '../repositories/ResourceRepository'
import type {
  Procedure,
  ProcedureRequirement,
  ProcedureWithDetails,
  ProcedureRequirementWithRole,
  CreateProcedureInput,
  CreateProcedureRequirementInput,
  Resource
} from '../types/resources'

export interface ProcedureServiceContext {
  tenant_id?: string
  user_id?: string
}

export interface ExpandedProcedureRequirement {
  role_id: string
  role_name: string
  quantity_min: number
  quantity_max: number
  is_required: boolean
  offset_start_minutes: number
  offset_end_minutes: number
  available_resources: Resource[]
}

export class ProcedureService {
  constructor(
    private procedureRepo: D1ProcedureRepository,
    private resourceRepo: D1ResourceRepository
  ) {}

  // =====================================================================
  // CRUD
  // =====================================================================

  async createProcedure(data: CreateProcedureInput, context: ProcedureServiceContext): Promise<Procedure> {
    // Validate code is unique
    const existing = await this.procedureRepo.getByCode(data.code)
    if (existing) {
      throw new Error(`Procedure with code '${data.code}' already exists`)
    }

    // Validate duration for atomic procedures
    if (data.procedure_type === 'atomic' && !data.duration_minutes) {
      throw new Error('Atomic procedures must have a duration')
    }

    // Validate children for composite procedures
    if (data.procedure_type === 'composite') {
      if (!data.children || data.children.length === 0) {
        throw new Error('Composite procedures must have at least one child')
      }

      // Validate all children exist
      for (const child of data.children) {
        const childProc = await this.procedureRepo.get(child.procedure_id)
        if (!childProc) {
          throw new Error(`Child procedure not found: ${child.procedure_id}`)
        }
      }
    }

    // Validate requirements if provided (for atomic procedures)
    if (data.requirements && data.requirements.length > 0) {
      for (const req of data.requirements) {
        const role = await this.resourceRepo.getRole(req.role_id)
        if (!role) {
          throw new Error(`Role not found: ${req.role_id}`)
        }
      }
    }

    return this.procedureRepo.create({
      ...data,
      tenant_id: data.tenant_id || context.tenant_id
    })
  }

  async updateProcedure(id: string, data: Partial<CreateProcedureInput>, context: ProcedureServiceContext): Promise<Procedure> {
    const existing = await this.procedureRepo.get(id)
    if (!existing) {
      throw new Error(`Procedure not found: ${id}`)
    }

    // Can't change type
    if (data.procedure_type && data.procedure_type !== existing.procedure_type) {
      throw new Error('Cannot change procedure type. Create a new procedure instead.')
    }

    // Validate code uniqueness if changing
    if (data.code && data.code !== existing.code) {
      const withCode = await this.procedureRepo.getByCode(data.code)
      if (withCode) {
        throw new Error(`Procedure with code '${data.code}' already exists`)
      }
    }

    return this.procedureRepo.update(id, data)
  }

  async deleteProcedure(id: string, context: ProcedureServiceContext): Promise<void> {
    const existing = await this.procedureRepo.get(id)
    if (!existing) {
      throw new Error(`Procedure not found: ${id}`)
    }

    // TODO: Check for active appointments using this procedure

    return this.procedureRepo.delete(id)
  }

  async getProcedure(id: string): Promise<Procedure | null> {
    return this.procedureRepo.get(id)
  }

  async getProcedureByCode(code: string): Promise<Procedure | null> {
    return this.procedureRepo.getByCode(code)
  }

  async getProcedureWithDetails(id: string): Promise<ProcedureWithDetails | null> {
    return this.procedureRepo.getWithDetails(id)
  }

  async listProcedures(params: {
    tenant_id?: string
    procedure_type?: 'atomic' | 'composite'
    is_active?: boolean
  }): Promise<Procedure[]> {
    return this.procedureRepo.list(params)
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    return this.procedureRepo.setActive(id, isActive)
  }

  // =====================================================================
  // REQUIREMENTS
  // =====================================================================

  async addRequirement(procedureId: string, data: CreateProcedureRequirementInput, context: ProcedureServiceContext): Promise<ProcedureRequirement> {
    const procedure = await this.procedureRepo.get(procedureId)
    if (!procedure) {
      throw new Error(`Procedure not found: ${procedureId}`)
    }

    if (procedure.procedure_type !== 'atomic') {
      throw new Error('Requirements can only be added to atomic procedures')
    }

    const role = await this.resourceRepo.getRole(data.role_id)
    if (!role) {
      throw new Error(`Role not found: ${data.role_id}`)
    }

    // Validate offset_end doesn't exceed duration
    if (data.offset_end_minutes !== undefined && procedure.duration_minutes) {
      if (data.offset_end_minutes > procedure.duration_minutes) {
        throw new Error(`Offset end (${data.offset_end_minutes}) cannot exceed procedure duration (${procedure.duration_minutes})`)
      }
    }

    return this.procedureRepo.createRequirement(procedureId, data)
  }

  async updateRequirement(id: string, data: Partial<CreateProcedureRequirementInput>, context: ProcedureServiceContext): Promise<ProcedureRequirement> {
    return this.procedureRepo.updateRequirement(id, data)
  }

  async deleteRequirement(id: string, context: ProcedureServiceContext): Promise<void> {
    return this.procedureRepo.deleteRequirement(id)
  }

  async getRequirements(procedureId: string): Promise<ProcedureRequirement[]> {
    return this.procedureRepo.getRequirements(procedureId)
  }

  async getRequirementsWithRoles(procedureId: string): Promise<ProcedureRequirementWithRole[]> {
    return this.procedureRepo.getRequirementsWithRoles(procedureId)
  }

  // =====================================================================
  // COMPOSITION
  // =====================================================================

  async addChild(parentId: string, childId: string, sequenceOrder: number, gapAfterMinutes = 0): Promise<void> {
    const parent = await this.procedureRepo.get(parentId)
    if (!parent) {
      throw new Error(`Parent procedure not found: ${parentId}`)
    }

    if (parent.procedure_type !== 'composite') {
      throw new Error('Can only add children to composite procedures')
    }

    const child = await this.procedureRepo.get(childId)
    if (!child) {
      throw new Error(`Child procedure not found: ${childId}`)
    }

    // Check for circular reference
    if (await this.wouldCreateCircularReference(parentId, childId)) {
      throw new Error('Cannot create circular reference')
    }

    await this.procedureRepo.addChild(parentId, childId, sequenceOrder, gapAfterMinutes)
  }

  async removeChild(parentId: string, childId: string): Promise<void> {
    await this.procedureRepo.removeChild(parentId, childId)
  }

  async reorderChildren(parentId: string, childOrder: { procedure_id: string; sequence_order: number }[]): Promise<void> {
    for (const child of childOrder) {
      await this.procedureRepo.updateChildOrder(parentId, child.procedure_id, child.sequence_order)
    }
  }

  // =====================================================================
  // EXPANDED REQUIREMENTS
  // =====================================================================

  /**
   * Get all requirements for a procedure (expanding composite procedures)
   * with absolute time offsets from the procedure start
   */
  async getExpandedRequirements(procedureId: string, tenantId?: string): Promise<ExpandedProcedureRequirement[]> {
    const procedure = await this.procedureRepo.get(procedureId)
    if (!procedure) {
      throw new Error(`Procedure not found: ${procedureId}`)
    }

    if (procedure.procedure_type === 'atomic') {
      return this.getAtomicRequirements(procedureId, 0, procedure.duration_minutes || 0, tenantId)
    }

    // Composite - expand children with correct offsets
    const children = await this.procedureRepo.getChildren(procedureId)
    const expandedReqs: ExpandedProcedureRequirement[] = []
    let currentOffset = procedure.buffer_before_minutes

    for (const child of children) {
      const childProc = await this.procedureRepo.get(child.child_procedure_id)
      if (!childProc) continue

      const childDuration = await this.procedureRepo.calculateTotalDuration(child.child_procedure_id)

      if (childProc.procedure_type === 'atomic') {
        const reqs = await this.getAtomicRequirements(child.child_procedure_id, currentOffset, childProc.duration_minutes || 0, tenantId)
        expandedReqs.push(...reqs)
      } else {
        // Nested composite - recursive expand
        const nestedReqs = await this.getExpandedRequirements(child.child_procedure_id, tenantId)
        for (const req of nestedReqs) {
          expandedReqs.push({
            ...req,
            offset_start_minutes: req.offset_start_minutes + currentOffset,
            offset_end_minutes: req.offset_end_minutes + currentOffset
          })
        }
      }

      currentOffset += childDuration + child.gap_after_minutes
    }

    return expandedReqs
  }

  private async getAtomicRequirements(
    procedureId: string,
    baseOffset: number,
    duration: number,
    tenantId?: string
  ): Promise<ExpandedProcedureRequirement[]> {
    const requirements = await this.procedureRepo.getRequirementsWithRoles(procedureId)
    const expanded: ExpandedProcedureRequirement[] = []

    for (const req of requirements) {
      const availableResources = await this.resourceRepo.getResourcesForRole(req.role_id, tenantId)

      expanded.push({
        role_id: req.role_id,
        role_name: req.role.name,
        quantity_min: req.quantity_min,
        quantity_max: req.quantity_max || req.quantity_min,
        is_required: req.is_required,
        offset_start_minutes: baseOffset + req.offset_start_minutes,
        offset_end_minutes: baseOffset + (req.offset_end_minutes || duration),
        available_resources: availableResources
      })
    }

    return expanded
  }

  // =====================================================================
  // DURATION
  // =====================================================================

  async getTotalDuration(procedureId: string): Promise<number> {
    return this.procedureRepo.calculateTotalDuration(procedureId)
  }

  // =====================================================================
  // HELPERS
  // =====================================================================

  private async wouldCreateCircularReference(parentId: string, childId: string): Promise<boolean> {
    // Check if adding childId as a child of parentId would create a cycle
    // (i.e., if parentId is already a descendant of childId)
    if (parentId === childId) return true

    const childChildren = await this.procedureRepo.getChildren(childId)
    for (const cc of childChildren) {
      if (cc.child_procedure_id === parentId) return true
      if (await this.wouldCreateCircularReference(parentId, cc.child_procedure_id)) {
        return true
      }
    }

    return false
  }
}
