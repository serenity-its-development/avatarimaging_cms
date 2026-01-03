/**
 * AvailabilityService - Business logic for resource availability
 * Handles availability windows, recurrence expansion, and conflict checking
 */

import { D1AvailabilityRepository } from '../repositories/AvailabilityRepository'
import { D1ResourceRepository } from '../repositories/ResourceRepository'
import { D1AppointmentRepository } from '../repositories/AppointmentRepository'
import type {
  ResourceAvailability,
  CalendarRecurrencePattern,
  ExpandedAvailabilityWindow,
  CreateAvailabilityInput,
  ResourceAvailabilityCheck,
  ResourceConflict,
  ReservationMode,
  DayOfWeek
} from '../types/resources'

export interface AvailabilityServiceContext {
  tenant_id?: string
  user_id?: string
}

// Day of week mapping for recurrence calculations
const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

export class AvailabilityService {
  constructor(
    private availabilityRepo: D1AvailabilityRepository,
    private resourceRepo: D1ResourceRepository,
    private appointmentRepo: D1AppointmentRepository
  ) {}

  // =====================================================================
  // CRUD
  // =====================================================================

  async createAvailability(data: CreateAvailabilityInput, context: AvailabilityServiceContext): Promise<ResourceAvailability> {
    // Validate resource exists
    const resource = await this.resourceRepo.getResource(data.resource_id)
    if (!resource) {
      throw new Error(`Resource not found: ${data.resource_id}`)
    }

    // Validate time range
    if (data.end_time <= data.start_time) {
      throw new Error('End time must be after start time')
    }

    // Validate recurrence pattern if provided
    if (data.recurrence_pattern) {
      this.validateRecurrencePattern(data.recurrence_pattern)
    }

    return this.availabilityRepo.create(data)
  }

  async updateAvailability(id: string, data: Partial<CreateAvailabilityInput>, context: AvailabilityServiceContext): Promise<ResourceAvailability> {
    const existing = await this.availabilityRepo.get(id)
    if (!existing) {
      throw new Error(`Availability not found: ${id}`)
    }

    if (data.recurrence_pattern) {
      this.validateRecurrencePattern(data.recurrence_pattern)
    }

    return this.availabilityRepo.update(id, data)
  }

  async deleteAvailability(id: string, context: AvailabilityServiceContext): Promise<void> {
    const existing = await this.availabilityRepo.get(id)
    if (!existing) {
      throw new Error(`Availability not found: ${id}`)
    }

    return this.availabilityRepo.delete(id)
  }

  async getAvailability(id: string): Promise<ResourceAvailability | null> {
    return this.availabilityRepo.get(id)
  }

  async getAvailabilityForResource(resourceId: string, startTime: number, endTime: number): Promise<ResourceAvailability[]> {
    return this.availabilityRepo.getForResource(resourceId, startTime, endTime)
  }

  // =====================================================================
  // RECURRENCE EXPANSION
  // =====================================================================

  /**
   * Expand a single availability record into concrete time windows
   */
  expandAvailability(
    availability: ResourceAvailability,
    rangeStart: number,
    rangeEnd: number
  ): ExpandedAvailabilityWindow[] {
    const windows: ExpandedAvailabilityWindow[] = []

    if (!availability.recurrence_pattern) {
      // Non-recurring - just check if it overlaps with the range
      if (availability.end_time >= rangeStart && availability.start_time <= rangeEnd) {
        windows.push({
          resource_id: availability.resource_id,
          start_time: Math.max(availability.start_time, rangeStart),
          end_time: Math.min(availability.end_time, rangeEnd),
          availability_type: availability.availability_type,
          reservation_mode: availability.reservation_mode_override || 'exclusive',
          max_concurrent: availability.max_concurrent_override || 1,
          source_availability_id: availability.id
        })
      }
      return windows
    }

    // Expand recurring pattern
    const pattern = availability.recurrence_pattern
    const duration = availability.end_time - availability.start_time

    // Get the time-of-day components from the original availability
    const originalDate = new Date(availability.start_time)
    const startHour = originalDate.getUTCHours()
    const startMinute = originalDate.getUTCMinutes()

    // Iterate through occurrences
    let occurrenceCount = 0
    let currentDate = new Date(availability.start_time)

    // Don't start before the availability's start time
    if (currentDate.getTime() < rangeStart) {
      // Fast-forward to a date near rangeStart
      currentDate = this.fastForwardToRange(currentDate, pattern, rangeStart)
    }

    const maxIterations = 1000 // Safety limit
    let iterations = 0

    while (currentDate.getTime() <= rangeEnd && iterations < maxIterations) {
      iterations++

      // Check if this occurrence is valid
      if (this.isValidOccurrence(currentDate, pattern, availability.start_time)) {
        const occurrenceStart = currentDate.getTime()
        const occurrenceEnd = occurrenceStart + duration

        // Check if occurrence is within range
        if (occurrenceEnd >= rangeStart && occurrenceStart <= rangeEnd) {
          windows.push({
            resource_id: availability.resource_id,
            start_time: occurrenceStart,
            end_time: occurrenceEnd,
            availability_type: availability.availability_type,
            reservation_mode: availability.reservation_mode_override || 'exclusive',
            max_concurrent: availability.max_concurrent_override || 1,
            source_availability_id: availability.id
          })
        }

        occurrenceCount++

        // Check numbered end condition
        if (pattern.range_type === 'numbered' && pattern.number_of_occurrences && occurrenceCount >= pattern.number_of_occurrences) {
          break
        }
      }

      // Check end date condition
      if (pattern.range_type === 'end_date' && pattern.end_date && currentDate.getTime() >= pattern.end_date) {
        break
      }

      // Move to next potential occurrence
      currentDate = this.getNextOccurrence(currentDate, pattern)
    }

    return windows
  }

  /**
   * Get all expanded availability windows for resources in a time range
   */
  async getExpandedAvailability(
    resourceIds: string[],
    startTime: number,
    endTime: number
  ): Promise<Map<string, ExpandedAvailabilityWindow[]>> {
    const result = new Map<string, ExpandedAvailabilityWindow[]>()

    // Initialize empty arrays for all resources
    for (const resourceId of resourceIds) {
      result.set(resourceId, [])
    }

    // Get raw availability records
    const availabilities = await this.availabilityRepo.getForResources(resourceIds, startTime, endTime)

    // Also get any recurring availabilities that might have started before but recur into range
    // For simplicity, we look back a reasonable amount (1 year for yearly recurrences)
    const lookbackStart = startTime - 365 * 24 * 60 * 60 * 1000
    const recurringAvailabilities = await this.availabilityRepo.list({
      resource_ids: resourceIds,
      start_time: lookbackStart,
      end_time: startTime
    })

    // Combine and deduplicate
    const allAvailabilities = [...availabilities]
    for (const ra of recurringAvailabilities) {
      if (ra.recurrence_pattern && !allAvailabilities.find(a => a.id === ra.id)) {
        allAvailabilities.push(ra)
      }
    }

    // Expand each availability
    for (const availability of allAvailabilities) {
      const windows = this.expandAvailability(availability, startTime, endTime)
      const existing = result.get(availability.resource_id) || []
      result.set(availability.resource_id, [...existing, ...windows])
    }

    return result
  }

  // =====================================================================
  // CONFLICT CHECKING
  // =====================================================================

  /**
   * Check if a resource is available for a given time range
   */
  async checkResourceAvailability(
    resourceId: string,
    startTime: number,
    endTime: number
  ): Promise<ResourceAvailabilityCheck> {
    const resource = await this.resourceRepo.getResource(resourceId)
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`)
    }

    // Get availability windows for this time range
    const expandedMap = await this.getExpandedAvailability([resourceId], startTime, endTime)
    const windows = expandedMap.get(resourceId) || []

    // Check for blocked periods
    const blockedWindows = windows.filter(w => w.availability_type === 'blocked')
    for (const blocked of blockedWindows) {
      if (this.timeRangesOverlap(startTime, endTime, blocked.start_time, blocked.end_time)) {
        return {
          resource_id: resourceId,
          is_available: false,
          reservation_mode: resource.default_reservation_mode,
          current_bookings: 0,
          max_concurrent: resource.max_concurrent_bookings,
          conflicts: [{
            appointment_id: 'blocked_period',
            reserved_start: blocked.start_time,
            reserved_end: blocked.end_time,
            reservation_mode: 'exclusive'
          }]
        }
      }
    }

    // Check for available periods - at least one must cover the full range
    const availableWindows = windows.filter(w => w.availability_type === 'available')
    let isCoveredByAvailability = availableWindows.length === 0 // If no availability defined, assume available

    if (availableWindows.length > 0) {
      // Check if the time range is covered by available windows
      isCoveredByAvailability = this.isTimeRangeCovered(startTime, endTime, availableWindows)
    }

    if (!isCoveredByAvailability) {
      return {
        resource_id: resourceId,
        is_available: false,
        reservation_mode: resource.default_reservation_mode,
        current_bookings: 0,
        max_concurrent: resource.max_concurrent_bookings,
        conflicts: []
      }
    }

    // Get current reservations
    const reservations = await this.appointmentRepo.getResourceReservations(resourceId, startTime, endTime)

    // Determine reservation mode for this time
    let mode = resource.default_reservation_mode
    let maxConcurrent = resource.max_concurrent_bookings

    // Check if any available window overrides the mode
    for (const window of availableWindows) {
      if (this.timeRangesOverlap(startTime, endTime, window.start_time, window.end_time)) {
        if (window.reservation_mode) {
          mode = window.reservation_mode
        }
        if (window.max_concurrent) {
          maxConcurrent = window.max_concurrent
        }
        break
      }
    }

    // Check for conflicts
    const conflicts: ResourceConflict[] = []

    if (mode === 'exclusive') {
      // Any existing reservation is a conflict
      for (const res of reservations) {
        if (this.timeRangesOverlap(startTime, endTime, res.reserved_start, res.reserved_end)) {
          conflicts.push({
            appointment_id: res.appointment_id,
            reserved_start: res.reserved_start,
            reserved_end: res.reserved_end,
            reservation_mode: res.reservation_mode
          })
        }
      }
    } else {
      // Shared mode - check concurrent count
      const concurrentCount = await this.appointmentRepo.countConcurrentReservations(resourceId, startTime, endTime)
      if (concurrentCount >= maxConcurrent) {
        // At capacity
        for (const res of reservations) {
          if (this.timeRangesOverlap(startTime, endTime, res.reserved_start, res.reserved_end)) {
            conflicts.push({
              appointment_id: res.appointment_id,
              reserved_start: res.reserved_start,
              reserved_end: res.reserved_end,
              reservation_mode: res.reservation_mode
            })
          }
        }
      }
    }

    return {
      resource_id: resourceId,
      is_available: conflicts.length === 0,
      reservation_mode: mode,
      current_bookings: reservations.length,
      max_concurrent: maxConcurrent,
      conflicts
    }
  }

  /**
   * Check multiple resources for availability
   */
  async checkMultipleResourceAvailability(
    resourceIds: string[],
    startTime: number,
    endTime: number
  ): Promise<Map<string, ResourceAvailabilityCheck>> {
    const result = new Map<string, ResourceAvailabilityCheck>()

    for (const resourceId of resourceIds) {
      const check = await this.checkResourceAvailability(resourceId, startTime, endTime)
      result.set(resourceId, check)
    }

    return result
  }

  // =====================================================================
  // HELPERS
  // =====================================================================

  private validateRecurrencePattern(pattern: CalendarRecurrencePattern): void {
    if (pattern.interval < 1) {
      throw new Error('Recurrence interval must be at least 1')
    }

    if (pattern.type === 'weekly' && (!pattern.days_of_week || pattern.days_of_week.length === 0)) {
      throw new Error('Weekly recurrence requires at least one day of week')
    }

    if (pattern.range_type === 'numbered' && (!pattern.number_of_occurrences || pattern.number_of_occurrences < 1)) {
      throw new Error('Numbered range requires positive occurrence count')
    }
  }

  private fastForwardToRange(date: Date, pattern: CalendarRecurrencePattern, rangeStart: number): Date {
    // Simple fast-forward - could be optimized for large jumps
    const result = new Date(date)

    while (result.getTime() < rangeStart - this.getPatternMaxDuration(pattern)) {
      const next = this.getNextOccurrence(result, pattern)
      if (next.getTime() <= result.getTime()) break // Safety check
      result.setTime(next.getTime())
    }

    return result
  }

  private getPatternMaxDuration(pattern: CalendarRecurrencePattern): number {
    // Return the maximum interval between occurrences
    switch (pattern.type) {
      case 'daily':
        return pattern.interval * 24 * 60 * 60 * 1000
      case 'weekly':
        return pattern.interval * 7 * 24 * 60 * 60 * 1000
      case 'monthly':
        return pattern.interval * 31 * 24 * 60 * 60 * 1000
      case 'yearly':
        return pattern.interval * 366 * 24 * 60 * 60 * 1000
      default:
        return 7 * 24 * 60 * 60 * 1000
    }
  }

  private isValidOccurrence(date: Date, pattern: CalendarRecurrencePattern, originalStart: number): boolean {
    // Check if this date is a valid occurrence based on the pattern
    if (pattern.type === 'weekly' && pattern.days_of_week) {
      const dayOfWeek = date.getUTCDay()
      const dayName = Object.entries(DAY_OF_WEEK_MAP).find(([_, num]) => num === dayOfWeek)?.[0] as DayOfWeek
      if (!pattern.days_of_week.includes(dayName)) {
        return false
      }
    }

    if (pattern.type === 'monthly') {
      if (pattern.day_of_month) {
        if (date.getUTCDate() !== pattern.day_of_month) {
          return false
        }
      }
      // TODO: Handle week_of_month patterns
    }

    return true
  }

  private getNextOccurrence(date: Date, pattern: CalendarRecurrencePattern): Date {
    const result = new Date(date)

    switch (pattern.type) {
      case 'daily':
        result.setUTCDate(result.getUTCDate() + pattern.interval)
        break

      case 'weekly':
        if (pattern.days_of_week && pattern.days_of_week.length > 0) {
          // Find next valid day
          let found = false
          for (let i = 1; i <= 7 * pattern.interval && !found; i++) {
            result.setUTCDate(result.getUTCDate() + 1)
            const dayOfWeek = result.getUTCDay()
            const dayName = Object.entries(DAY_OF_WEEK_MAP).find(([_, num]) => num === dayOfWeek)?.[0] as DayOfWeek
            if (pattern.days_of_week.includes(dayName)) {
              found = true
            }
          }
        } else {
          result.setUTCDate(result.getUTCDate() + 7 * pattern.interval)
        }
        break

      case 'monthly':
        result.setUTCMonth(result.getUTCMonth() + pattern.interval)
        if (pattern.day_of_month) {
          result.setUTCDate(pattern.day_of_month)
        }
        break

      case 'yearly':
        result.setUTCFullYear(result.getUTCFullYear() + pattern.interval)
        break
    }

    return result
  }

  private timeRangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && end1 > start2
  }

  private isTimeRangeCovered(start: number, end: number, windows: ExpandedAvailabilityWindow[]): boolean {
    // Simple check - is the entire range covered by at least one window?
    // Could be enhanced to check for gaps in coverage
    for (const window of windows) {
      if (window.start_time <= start && window.end_time >= end) {
        return true
      }
    }

    // Check if windows together cover the range (no gaps)
    const sortedWindows = [...windows].sort((a, b) => a.start_time - b.start_time)
    let covered = start

    for (const window of sortedWindows) {
      if (window.start_time > covered) {
        // Gap found
        return false
      }
      covered = Math.max(covered, window.end_time)
      if (covered >= end) {
        return true
      }
    }

    return covered >= end
  }
}
