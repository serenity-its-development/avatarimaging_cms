/**
 * SlotGenerationService - Auto-generates bookable slots from resource availability
 */

import { D1ProcedureRepository } from '../repositories/ProcedureRepository'
import { D1ResourceRepository } from '../repositories/ResourceRepository'
import { D1AppointmentRepository } from '../repositories/AppointmentRepository'
import { AvailabilityService } from './AvailabilityService'
import { ProcedureService, ExpandedProcedureRequirement } from './ProcedureService'
import type {
  ProcedureSlot,
  GeneratedSlot,
  ResourceCombination,
  ResourceAssignment,
  Resource,
  ExpandedAvailabilityWindow
} from '../types/resources'

export interface SlotGenerationContext {
  tenant_id?: string
  user_id?: string
}

export interface SlotGenerationParams {
  procedure_id: string
  start_date: number          // Start of date range (UTC timestamp)
  end_date: number            // End of date range
  tenant_id?: string
  location_resource_id?: string  // Filter by location
  slot_interval_minutes?: number // How often to try generating slots (default: 15)
  max_slots?: number          // Maximum slots to generate
}

export class SlotGenerationService {
  constructor(
    private procedureRepo: D1ProcedureRepository,
    private _resourceRepo: D1ResourceRepository,  // Reserved for future use
    private appointmentRepo: D1AppointmentRepository,
    private availabilityService: AvailabilityService,
    private procedureService: ProcedureService
  ) {}

  /**
   * Generate available slots for a procedure in a date range
   */
  async generateSlots(params: SlotGenerationParams, _context: SlotGenerationContext): Promise<GeneratedSlot[]> {
    const {
      procedure_id,
      start_date,
      end_date,
      tenant_id,
      location_resource_id,
      slot_interval_minutes = 15,
      max_slots = 100
    } = params

    // Get procedure details
    const procedure = await this.procedureRepo.get(procedure_id)
    if (!procedure) {
      throw new Error(`Procedure not found: ${procedure_id}`)
    }

    // Get total duration
    const totalDuration = await this.procedureService.getTotalDuration(procedure_id)

    // Get expanded requirements with available resources
    const requirements = await this.procedureService.getExpandedRequirements(procedure_id, tenant_id)

    if (requirements.length === 0) {
      throw new Error('Procedure has no requirements defined')
    }

    // Get all resources that could fulfill requirements
    const allResourceIds = new Set<string>()
    for (const req of requirements) {
      for (const resource of req.available_resources) {
        // Filter by location if specified
        if (location_resource_id) {
          if (resource.parent_resource_id !== location_resource_id &&
              resource.id !== location_resource_id) {
            continue
          }
        }
        allResourceIds.add(resource.id)
      }
    }

    if (allResourceIds.size === 0) {
      return [] // No resources available
    }

    // Get availability for all relevant resources
    const resourceAvailability = await this.availabilityService.getExpandedAvailability(
      Array.from(allResourceIds),
      start_date,
      end_date
    )

    // Generate slots
    const slots: GeneratedSlot[] = []
    const intervalMs = slot_interval_minutes * 60 * 1000
    const durationMs = totalDuration * 60 * 1000

    let currentTime = start_date

    while (currentTime + durationMs <= end_date && slots.length < max_slots) {
      const slotStart = currentTime
      const slotEnd = slotStart + durationMs

      // Try to find valid resource combinations for this time
      const combinations = await this.findValidCombinations(
        requirements,
        slotStart,
        resourceAvailability,
        location_resource_id
      )

      if (combinations.length > 0) {
        slots.push({
          start_time: slotStart,
          end_time: slotEnd,
          available_resource_combinations: combinations
        })
      }

      currentTime += intervalMs
    }

    return slots
  }

  /**
   * Create procedure slots in the database
   */
  async createSlotsInRange(
    params: SlotGenerationParams,
    context: SlotGenerationContext
  ): Promise<ProcedureSlot[]> {
    const generatedSlots = await this.generateSlots(params, context)
    const createdSlots: ProcedureSlot[] = []

    for (const slot of generatedSlots) {
      // Check if slot already exists at this time
      const existing = await this.appointmentRepo.listSlots({
        procedure_id: params.procedure_id,
        tenant_id: params.tenant_id,
        start_time: slot.start_time,
        end_time: slot.start_time + 1, // Exact match
        limit: 1
      })

      if (existing.length === 0) {
        const created = await this.appointmentRepo.createSlot({
          procedure_id: params.procedure_id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: 'available',
          generation_type: 'auto',
          tenant_id: params.tenant_id,
          created_by: context.user_id
        })
        createdSlots.push(created)
      }
    }

    return createdSlots
  }

  /**
   * Find valid resource combinations for a specific time
   */
  private async findValidCombinations(
    requirements: ExpandedProcedureRequirement[],
    slotStartTime: number,
    resourceAvailability: Map<string, ExpandedAvailabilityWindow[]>,
    locationFilter?: string
  ): Promise<ResourceCombination[]> {
    // Group requirements by role
    const requiredRoles = requirements.filter(r => r.is_required)
    // Optional roles reserved for future enhancement
    const _optionalRoles = requirements.filter(r => !r.is_required)

    // For each required role, find available resources
    const roleResources: Map<string, { resource: Resource; windows: ExpandedAvailabilityWindow[] }[]> = new Map()

    for (const req of requiredRoles) {
      const available: { resource: Resource; windows: ExpandedAvailabilityWindow[] }[] = []

      for (const resource of req.available_resources) {
        // Apply location filter
        if (locationFilter) {
          if (resource.parent_resource_id !== locationFilter && resource.id !== locationFilter) {
            continue
          }
        }

        // Get availability windows for this resource
        const windows = resourceAvailability.get(resource.id) || []

        // Check if resource is available for the required time window
        const reqStartTime = slotStartTime + req.offset_start_minutes * 60 * 1000
        const reqEndTime = slotStartTime + req.offset_end_minutes * 60 * 1000

        // Find available windows that cover this time
        const coveringWindows = windows.filter(w =>
          w.availability_type === 'available' &&
          w.start_time <= reqStartTime &&
          w.end_time >= reqEndTime
        )

        // Check for blocked windows
        const blockedWindows = windows.filter(w =>
          w.availability_type === 'blocked' &&
          w.start_time < reqEndTime &&
          w.end_time > reqStartTime
        )

        if (coveringWindows.length > 0 && blockedWindows.length === 0) {
          available.push({ resource, windows: coveringWindows })
        }
      }

      if (available.length === 0 && req.quantity_min > 0) {
        // No resources available for a required role - no valid combinations
        return []
      }

      roleResources.set(req.role_id, available)
    }

    // Generate combinations (simplified - just picks first available for each role)
    // A full implementation would generate all valid combinations and rank them
    const assignments: ResourceAssignment[] = []
    let priorityScore = 0

    for (const req of requiredRoles) {
      const available = roleResources.get(req.role_id) || []
      if (available.length === 0 && req.quantity_min > 0) {
        return []
      }

      for (let i = 0; i < Math.min(req.quantity_min, available.length); i++) {
        const { resource } = available[i]
        assignments.push({
          role_id: req.role_id,
          resource_id: resource.id,
          reserved_start: slotStartTime + req.offset_start_minutes * 60 * 1000,
          reserved_end: slotStartTime + req.offset_end_minutes * 60 * 1000
        })
        priorityScore += i // Lower indices have higher priority
      }
    }

    if (assignments.length === 0) {
      return []
    }

    // For now, return a single combination
    // A full implementation would return multiple options
    return [{
      resources: assignments,
      priority_score: priorityScore
    }]
  }

  /**
   * Check if a specific slot time is still valid (resources still available)
   */
  async validateSlot(slotId: string): Promise<{
    valid: boolean
    issues: string[]
    suggestedAlternatives?: GeneratedSlot[]
  }> {
    const slot = await this.appointmentRepo.getSlot(slotId)
    if (!slot) {
      return { valid: false, issues: ['Slot not found'] }
    }

    if (slot.status !== 'available') {
      return { valid: false, issues: [`Slot is ${slot.status}`] }
    }

    const procedure = await this.procedureRepo.get(slot.procedure_id)
    if (!procedure) {
      return { valid: false, issues: ['Procedure not found'] }
    }

    const requirements = await this.procedureService.getExpandedRequirements(slot.procedure_id, slot.tenant_id || undefined)
    const issues: string[] = []

    // Check each requirement
    for (const req of requirements) {
      if (!req.is_required) continue

      let availableCount = 0
      for (const resource of req.available_resources) {
        const check = await this.availabilityService.checkResourceAvailability(
          resource.id,
          slot.start_time + req.offset_start_minutes * 60 * 1000,
          slot.start_time + req.offset_end_minutes * 60 * 1000
        )
        if (check.is_available) {
          availableCount++
        }
      }

      if (availableCount < req.quantity_min) {
        issues.push(`Not enough ${req.role_name} available (need ${req.quantity_min}, have ${availableCount})`)
      }
    }

    if (issues.length > 0) {
      // Try to find alternatives
      const alternatives = await this.generateSlots({
        procedure_id: slot.procedure_id,
        start_date: slot.start_time,
        end_date: slot.start_time + 7 * 24 * 60 * 60 * 1000, // Next 7 days
        tenant_id: slot.tenant_id || undefined,
        max_slots: 5
      }, {})

      return {
        valid: false,
        issues,
        suggestedAlternatives: alternatives
      }
    }

    return { valid: true, issues: [] }
  }

  /**
   * Clean up stale auto-generated slots that are no longer valid
   */
  async cleanupStaleSlots(tenantId: string, olderThan: number): Promise<number> {
    // Get all auto-generated available slots older than the threshold
    const slots = await this.appointmentRepo.listSlots({
      tenant_id: tenantId,
      status: 'available',
      end_time: olderThan
    })

    let deletedCount = 0
    for (const slot of slots) {
      if (slot.generation_type === 'auto' && slot.end_time < Date.now()) {
        await this.appointmentRepo.deleteSlot(slot.id)
        deletedCount++
      }
    }

    return deletedCount
  }
}
