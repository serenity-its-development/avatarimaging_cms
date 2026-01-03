/**
 * AppointmentBookingService - Handles the full booking flow
 * Creates appointments, assigns resources, handles preferences and conflicts
 */

import { D1ProcedureRepository } from '../repositories/ProcedureRepository'
import { D1ResourceRepository } from '../repositories/ResourceRepository'
import { D1AppointmentRepository } from '../repositories/AppointmentRepository'
import { AvailabilityService } from './AvailabilityService'
import { ProcedureService, ExpandedProcedureRequirement } from './ProcedureService'
import { SlotGenerationService } from './SlotGenerationService'
import type {
  Appointment,
  AppointmentWithDetails,
  AppointmentResource,
  AppointmentPreference,
  ProcedureSlot,
  BookingRequest,
  BookingResult,
  PreferenceType,
  ResourceConflict,
  GeneratedSlot,
  Resource
} from '../types/resources'

export interface BookingServiceContext {
  tenant_id?: string
  user_id?: string
}

export class AppointmentBookingService {
  constructor(
    private procedureRepo: D1ProcedureRepository,
    private resourceRepo: D1ResourceRepository,
    private appointmentRepo: D1AppointmentRepository,
    private availabilityService: AvailabilityService,
    private procedureService: ProcedureService,
    private slotGenerationService: SlotGenerationService
  ) {}

  /**
   * Book an appointment
   */
  async book(request: BookingRequest, context: BookingServiceContext): Promise<BookingResult> {
    const warnings: string[] = []

    // Get or create slot
    let slot: ProcedureSlot | null = null

    if (request.slot_id) {
      slot = await this.appointmentRepo.getSlot(request.slot_id)
      if (!slot) {
        return {
          success: false,
          conflicts: [],
          warnings: ['Slot not found']
        }
      }
      if (slot.status !== 'available') {
        return {
          success: false,
          conflicts: [],
          warnings: [`Slot is ${slot.status}`]
        }
      }
    } else if (request.start_time) {
      // Create a new slot on-the-fly
      const procedure = await this.procedureRepo.get(request.procedure_id)
      if (!procedure) {
        return {
          success: false,
          conflicts: [],
          warnings: ['Procedure not found']
        }
      }

      const duration = await this.procedureService.getTotalDuration(request.procedure_id)

      slot = await this.appointmentRepo.createSlot({
        procedure_id: request.procedure_id,
        start_time: request.start_time,
        end_time: request.start_time + duration * 60 * 1000,
        status: 'available',
        generation_type: 'manual',
        tenant_id: context.tenant_id,
        created_by: context.user_id
      })
    } else {
      return {
        success: false,
        conflicts: [],
        warnings: ['Either slot_id or start_time is required']
      }
    }

    // Get procedure requirements
    const requirements = await this.procedureService.getExpandedRequirements(
      slot.procedure_id,
      slot.tenant_id || undefined
    )

    // Process preferences and assign resources
    const { assignments, conflicts, resourceWarnings } = await this.assignResources(
      slot,
      requirements,
      request.preferences || [],
      context
    )

    warnings.push(...resourceWarnings)

    if (conflicts.length > 0) {
      // Check if any conflicts are from required preferences
      const requiredConflicts = conflicts.filter(c => {
        const pref = request.preferences?.find(p => p.resource_id === c.appointment_id.split('_')[0])
        return pref?.preference_type === 'required'
      })

      if (requiredConflicts.length > 0) {
        // Can't book - required resource not available
        const alternatives = await this.slotGenerationService.generateSlots({
          procedure_id: slot.procedure_id,
          start_date: slot.start_time,
          end_date: slot.start_time + 14 * 24 * 60 * 60 * 1000, // 2 weeks
          tenant_id: slot.tenant_id || undefined,
          max_slots: 5
        }, context)

        return {
          success: false,
          conflicts: requiredConflicts,
          suggested_alternatives: alternatives,
          warnings: ['Required resource not available']
        }
      }
    }

    // All required resources are available (or preferences are soft)
    // Create the appointment
    const appointment = await this.appointmentRepo.createAppointment({
      procedure_slot_id: slot.id,
      contact_id: request.contact_id,
      preferences: request.preferences,
      notes: request.notes
    })

    // Create resource assignments
    for (const assignment of assignments) {
      await this.appointmentRepo.assignResource({
        appointment_id: appointment.id,
        resource_id: assignment.resource_id,
        role_id: assignment.role_id,
        reserved_start: assignment.reserved_start,
        reserved_end: assignment.reserved_end,
        reservation_mode: assignment.reservation_mode,
        quantity_consumed: assignment.quantity_consumed
      })

      // Update inventory for consumables
      if (assignment.quantity_consumed) {
        await this.resourceRepo.updateInventory(assignment.resource_id, -assignment.quantity_consumed)
      }
    }

    // Get full appointment details
    const appointmentWithDetails = await this.appointmentRepo.getAppointmentWithDetails(appointment.id)

    return {
      success: true,
      appointment: appointmentWithDetails!,
      conflicts: [],
      warnings
    }
  }

  /**
   * Assign resources to fulfill procedure requirements
   */
  private async assignResources(
    slot: ProcedureSlot,
    requirements: ExpandedProcedureRequirement[],
    preferences: { role_id: string; resource_id: string; preference_type: PreferenceType }[],
    context: BookingServiceContext
  ): Promise<{
    assignments: {
      resource_id: string
      role_id: string
      reserved_start: number
      reserved_end: number
      reservation_mode: 'exclusive' | 'shared'
      quantity_consumed?: number
    }[]
    conflicts: ResourceConflict[]
    resourceWarnings: string[]
  }> {
    const assignments: {
      resource_id: string
      role_id: string
      reserved_start: number
      reserved_end: number
      reservation_mode: 'exclusive' | 'shared'
      quantity_consumed?: number
    }[] = []
    const conflicts: ResourceConflict[] = []
    const warnings: string[] = []

    // Group preferences by role
    const preferencesByRole = new Map<string, { resource_id: string; preference_type: PreferenceType }[]>()
    for (const pref of preferences) {
      const existing = preferencesByRole.get(pref.role_id) || []
      existing.push(pref)
      preferencesByRole.set(pref.role_id, existing)
    }

    for (const req of requirements) {
      const rolePreferences = preferencesByRole.get(req.role_id) || []
      let assigned = 0

      // Calculate time window for this requirement
      const reqStart = slot.start_time + req.offset_start_minutes * 60 * 1000
      const reqEnd = slot.start_time + req.offset_end_minutes * 60 * 1000

      // Try preferred resources first (in order of priority)
      for (const pref of rolePreferences.sort((a, b) => preferences.indexOf(a) - preferences.indexOf(b))) {
        if (assigned >= req.quantity_min) break

        const resource = req.available_resources.find(r => r.id === pref.resource_id)
        if (!resource) continue

        const check = await this.availabilityService.checkResourceAvailability(
          pref.resource_id,
          reqStart,
          reqEnd
        )

        if (check.is_available) {
          assignments.push({
            resource_id: pref.resource_id,
            role_id: req.role_id,
            reserved_start: reqStart,
            reserved_end: reqEnd,
            reservation_mode: check.reservation_mode,
            quantity_consumed: resource.is_consumable ? 1 : undefined
          })
          assigned++
        } else {
          conflicts.push(...check.conflicts)

          if (pref.preference_type === 'preferred') {
            warnings.push(`Preferred ${req.role_name} (${resource.name}) not available, will assign alternative`)
          }
        }
      }

      // If we still need more resources, assign from available pool
      if (assigned < req.quantity_min) {
        // Sort by priority
        const sortedResources = [...req.available_resources].sort((a, b) => {
          // Already assigned resources should be skipped
          if (assignments.find(ass => ass.resource_id === a.id && ass.role_id === req.role_id)) return 1
          if (assignments.find(ass => ass.resource_id === b.id && ass.role_id === req.role_id)) return -1
          return 0
        })

        for (const resource of sortedResources) {
          if (assigned >= req.quantity_min) break
          if (assignments.find(ass => ass.resource_id === resource.id && ass.role_id === req.role_id)) continue

          const check = await this.availabilityService.checkResourceAvailability(
            resource.id,
            reqStart,
            reqEnd
          )

          if (check.is_available) {
            // Check inventory for consumables
            if (resource.is_consumable) {
              const currentQty = resource.quantity_on_hand || 0
              const reserved = await this.getReservedQuantity(resource.id)
              const available = currentQty - reserved

              if (available < 1) {
                if (resource.quantity_threshold && available <= resource.quantity_threshold) {
                  warnings.push(`Low inventory: ${resource.name} (${available} remaining)`)
                }
                continue // Skip this resource if out of stock
              }
            }

            assignments.push({
              resource_id: resource.id,
              role_id: req.role_id,
              reserved_start: reqStart,
              reserved_end: reqEnd,
              reservation_mode: check.reservation_mode,
              quantity_consumed: resource.is_consumable ? 1 : undefined
            })
            assigned++
          }
        }
      }

      // Check if we met the minimum requirement
      if (assigned < req.quantity_min && req.is_required) {
        warnings.push(`Could not assign enough ${req.role_name} (need ${req.quantity_min}, got ${assigned})`)
      }
    }

    return { assignments, conflicts, resourceWarnings: warnings }
  }

  /**
   * Get reserved quantity for a consumable resource
   */
  private async getReservedQuantity(resourceId: string): Promise<number> {
    // Count upcoming appointments using this consumable
    const now = Date.now()
    const reservations = await this.appointmentRepo.getResourceReservations(
      resourceId,
      now,
      now + 30 * 24 * 60 * 60 * 1000 // Next 30 days
    )

    return reservations.reduce((sum, r) => sum + (r.quantity_consumed || 0), 0)
  }

  /**
   * Cancel an appointment
   */
  async cancel(appointmentId: string, reason?: string, context?: BookingServiceContext): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointment(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`)
    }

    // Restore consumable inventory
    const resources = await this.appointmentRepo.getAppointmentResources(appointmentId)
    for (const res of resources) {
      if (res.quantity_consumed) {
        await this.resourceRepo.updateInventory(res.resource_id, res.quantity_consumed)
      }
    }

    // Update appointment status
    return this.appointmentRepo.updateAppointment(appointmentId, {
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : appointment.notes
    })
  }

  /**
   * Complete an appointment
   */
  async complete(appointmentId: string, notes?: string, context?: BookingServiceContext): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointment(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`)
    }

    return this.appointmentRepo.updateAppointment(appointmentId, {
      status: 'completed',
      notes: notes || appointment.notes
    })
  }

  /**
   * Mark appointment as no-show
   */
  async markNoShow(appointmentId: string, context?: BookingServiceContext): Promise<Appointment> {
    const appointment = await this.appointmentRepo.getAppointment(appointmentId)
    if (!appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`)
    }

    // For consumables, we don't restore inventory on no-show (item was prepared)

    return this.appointmentRepo.updateAppointment(appointmentId, {
      status: 'no_show'
    })
  }

  /**
   * Reschedule an appointment to a different slot
   */
  async reschedule(
    appointmentId: string,
    newSlotId: string,
    context: BookingServiceContext
  ): Promise<BookingResult> {
    const oldAppointment = await this.appointmentRepo.getAppointmentWithDetails(appointmentId)
    if (!oldAppointment) {
      throw new Error(`Appointment not found: ${appointmentId}`)
    }

    // Cancel the old appointment (restores inventory)
    await this.cancel(appointmentId, 'Rescheduled', context)

    // Book the new slot with the same preferences
    const preferences = oldAppointment.preferences.map(p => ({
      role_id: p.role_id,
      resource_id: p.resource_id,
      preference_type: p.preference_type
    }))

    return this.book({
      slot_id: newSlotId,
      contact_id: oldAppointment.contact_id || '',
      preferences,
      notes: `Rescheduled from ${new Date(oldAppointment.procedure_slot.start_time).toISOString()}`
    }, context)
  }

  /**
   * Check if a resource needs coverage (staff going on leave)
   */
  async checkCoverageNeeded(
    resourceId: string,
    startTime: number,
    endTime: number
  ): Promise<{
    appointments: AppointmentWithDetails[]
    canAutoReassign: boolean
    suggestedReplacements: Map<string, Resource[]>
  }> {
    // Get all appointments using this resource in the time range
    const reservations = await this.appointmentRepo.getResourceReservations(resourceId, startTime, endTime)

    const appointments: AppointmentWithDetails[] = []
    const suggestedReplacements = new Map<string, Resource[]>()

    for (const res of reservations) {
      const appt = await this.appointmentRepo.getAppointmentWithDetails(res.appointment_id)
      if (appt && appt.status !== 'cancelled' && appt.status !== 'completed') {
        appointments.push(appt)

        // Find alternative resources for this role
        const alternatives = await this.resourceRepo.getResourcesForRole(res.role_id)
        const available = alternatives.filter(alt => alt.id !== resourceId && alt.is_active)

        suggestedReplacements.set(res.appointment_id, available)
      }
    }

    // Check if all appointments can be auto-reassigned
    const canAutoReassign = appointments.every(appt => {
      const replacements = suggestedReplacements.get(appt.id) || []
      return replacements.length > 0
    })

    return {
      appointments,
      canAutoReassign,
      suggestedReplacements
    }
  }

  /**
   * Reassign a resource for an appointment
   */
  async reassignResource(
    appointmentId: string,
    oldResourceId: string,
    newResourceId: string,
    context: BookingServiceContext
  ): Promise<AppointmentResource> {
    const resources = await this.appointmentRepo.getAppointmentResources(appointmentId)
    const oldAssignment = resources.find(r => r.resource_id === oldResourceId)

    if (!oldAssignment) {
      throw new Error('Resource not assigned to this appointment')
    }

    // Check new resource availability
    const check = await this.availabilityService.checkResourceAvailability(
      newResourceId,
      oldAssignment.reserved_start,
      oldAssignment.reserved_end
    )

    if (!check.is_available) {
      throw new Error('New resource is not available for this time')
    }

    // Remove old assignment
    await this.appointmentRepo.unassignResource(oldAssignment.id)

    // Create new assignment
    return this.appointmentRepo.assignResource({
      appointment_id: appointmentId,
      resource_id: newResourceId,
      role_id: oldAssignment.role_id,
      reserved_start: oldAssignment.reserved_start,
      reserved_end: oldAssignment.reserved_end,
      reservation_mode: check.reservation_mode
    })
  }
}
