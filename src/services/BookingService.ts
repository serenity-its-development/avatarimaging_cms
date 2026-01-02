/**
 * BookingService - Business logic for appointment management
 * Integrates with Wix Bookings, handles staff assignment, sends confirmations
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type {
  Booking,
  Contact,
  StaffUser,
  CreateBookingInput,
  UpdateBookingInput
} from '../types/entities'

export interface BookingServiceContext {
  tenant_id: string
  user_id: string
  ip_address?: string
}

export interface CreateBookingResult {
  booking: Booking
  confirmation_sent: boolean
  wix_synced: boolean
}

export interface AvailabilitySlot {
  start_time: number
  end_time: number
  staff_id: string
  staff_name: string
}

export interface BookingAnalytics {
  total_bookings: number
  confirmed: number
  cancelled: number
  no_show: number
  completion_rate: number
  average_lead_time_hours: number
  most_popular_service: string
}

export class BookingService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  /**
   * Create new booking with SMS confirmation
   */
  async create(
    data: CreateBookingInput,
    context: BookingServiceContext
  ): Promise<CreateBookingResult> {
    // Validate contact exists
    const contact = await this.db.contacts.get(data.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${data.contact_id}`)
    }

    // Validate staff availability
    if (data.staff_id) {
      const isAvailable = await this.checkStaffAvailability(
        data.staff_id,
        data.start_time,
        data.end_time
      )
      if (!isAvailable) {
        throw new Error(`Staff member not available at requested time`)
      }
    }

    // Create booking
    const booking = await this.db.bookings.create(data)

    // Update contact pipeline if needed
    if (contact.current_pipeline === 'new_lead' || contact.current_pipeline === 'nurture') {
      await this.db.contacts.update(data.contact_id, {
        current_pipeline: 'appointment_booked',
        current_stage: 'confirmed'
      })
    }

    // Create touchpoint
    await this.db.touchpoints.create({
      contact_id: data.contact_id,
      touchpoint_type: 'booking_created',
      channel: 'system',
      direction: 'outbound',
      summary: `Appointment booked for ${new Date(data.start_time).toLocaleString()}`,
      data: { booking_id: booking.id, service_type: data.service_type }
    })

    // Send SMS confirmation
    let confirmationSent = false
    try {
      await this.queue.send('sms', {
        type: 'booking_confirmation',
        contact_id: data.contact_id,
        booking_id: booking.id,
        phone: contact.phone,
        name: contact.name,
        start_time: data.start_time,
        service_type: data.service_type
      })
      confirmationSent = true
    } catch (error) {
      console.error('Failed to queue SMS confirmation:', error)
    }

    // Queue Wix sync if wix_booking_id provided
    let wixSynced = false
    if (data.wix_booking_id) {
      try {
        await this.queue.send('wix_sync', {
          type: 'booking_created',
          booking_id: booking.id,
          wix_booking_id: data.wix_booking_id
        })
        wixSynced = true
      } catch (error) {
        console.error('Failed to queue Wix sync:', error)
      }
    }

    // Emit automation event
    await this.queue.send('automation', {
      type: 'booking_created',
      booking_id: booking.id,
      contact_id: data.contact_id,
      tenant_id: context.tenant_id,
      start_time: data.start_time
    })

    return {
      booking,
      confirmation_sent: confirmationSent,
      wix_synced: wixSynced
    }
  }

  /**
   * Update booking with re-confirmation if time changed
   */
  async update(
    id: string,
    data: UpdateBookingInput,
    context: BookingServiceContext
  ): Promise<{ booking: Booking; confirmation_sent: boolean }> {
    const existing = await this.db.bookings.get(id)
    if (!existing) {
      throw new Error(`Booking not found: ${id}`)
    }

    // If time changed, validate staff availability
    if (data.start_time && data.start_time !== existing.start_time) {
      const staffId = data.staff_id || existing.staff_id
      if (staffId) {
        const endTime = data.end_time || existing.end_time
        const isAvailable = await this.checkStaffAvailability(staffId, data.start_time, endTime)
        if (!isAvailable) {
          throw new Error(`Staff member not available at requested time`)
        }
      }
    }

    const booking = await this.db.bookings.update(id, data)

    // Create touchpoint for status changes
    if (data.status && data.status !== existing.status) {
      const contact = await this.db.contacts.get(existing.contact_id)
      if (contact) {
        await this.db.touchpoints.create({
          contact_id: contact.id,
          touchpoint_type: 'booking_updated',
          channel: 'system',
          direction: 'outbound',
          summary: `Appointment ${data.status}`,
          data: { booking_id: booking.id, old_status: existing.status, new_status: data.status }
        })
      }
    }

    // Send confirmation if time changed
    let confirmationSent = false
    if (data.start_time && data.start_time !== existing.start_time) {
      const contact = await this.db.contacts.get(existing.contact_id)
      if (contact) {
        try {
          await this.queue.send('sms', {
            type: 'booking_rescheduled',
            contact_id: contact.id,
            booking_id: booking.id,
            phone: contact.phone,
            name: contact.name,
            start_time: booking.start_time,
            service_type: booking.service_type
          })
          confirmationSent = true
        } catch (error) {
          console.error('Failed to queue SMS confirmation:', error)
        }
      }
    }

    // Emit automation event
    await this.queue.send('automation', {
      type: 'booking_updated',
      booking_id: booking.id,
      contact_id: existing.contact_id,
      tenant_id: context.tenant_id,
      changes: Object.keys(data)
    })

    return { booking, confirmation_sent: confirmationSent }
  }

  /**
   * Cancel booking with notification
   */
  async cancel(
    id: string,
    reason: string,
    context: BookingServiceContext
  ): Promise<void> {
    const booking = await this.db.bookings.get(id)
    if (!booking) {
      throw new Error(`Booking not found: ${id}`)
    }

    await this.db.bookings.update(id, {
      status: 'cancelled',
      cancellation_reason: reason
    })

    // Create touchpoint
    const contact = await this.db.contacts.get(booking.contact_id)
    if (contact) {
      await this.db.touchpoints.create({
        contact_id: contact.id,
        touchpoint_type: 'booking_cancelled',
        channel: 'system',
        direction: 'outbound',
        summary: `Appointment cancelled: ${reason}`,
        data: { booking_id: booking.id, reason }
      })

      // Send cancellation SMS
      await this.queue.send('sms', {
        type: 'booking_cancelled',
        contact_id: contact.id,
        booking_id: booking.id,
        phone: contact.phone,
        name: contact.name,
        start_time: booking.start_time,
        reason
      })
    }

    await this.queue.send('automation', {
      type: 'booking_cancelled',
      booking_id: booking.id,
      contact_id: booking.contact_id,
      tenant_id: context.tenant_id,
      reason
    })
  }

  /**
   * Mark booking as completed
   */
  async complete(
    id: string,
    notes?: string,
    context?: BookingServiceContext
  ): Promise<Booking> {
    const booking = await this.db.bookings.update(id, {
      status: 'completed',
      notes: notes || booking.notes
    })

    // Update contact to post-appointment pipeline
    const contact = await this.db.contacts.get(booking.contact_id)
    if (contact) {
      await this.db.contacts.update(contact.id, {
        current_pipeline: 'post_appointment',
        current_stage: 'follow_up_needed',
        is_existing_patient: true
      })

      await this.db.touchpoints.create({
        contact_id: contact.id,
        touchpoint_type: 'booking_completed',
        channel: 'system',
        direction: 'inbound',
        summary: 'Appointment completed',
        data: { booking_id: booking.id }
      })
    }

    if (context) {
      await this.queue.send('automation', {
        type: 'booking_completed',
        booking_id: booking.id,
        contact_id: booking.contact_id,
        tenant_id: context.tenant_id
      })
    }

    return booking
  }

  /**
   * Mark booking as no-show
   */
  async markNoShow(id: string, context: BookingServiceContext): Promise<Booking> {
    const booking = await this.db.bookings.update(id, {
      status: 'no_show'
    })

    const contact = await this.db.contacts.get(booking.contact_id)
    if (contact) {
      await this.db.touchpoints.create({
        contact_id: contact.id,
        touchpoint_type: 'booking_no_show',
        channel: 'system',
        direction: 'inbound',
        summary: 'Patient did not show up for appointment',
        data: { booking_id: booking.id }
      })

      // Update contact pipeline
      await this.db.contacts.update(contact.id, {
        current_pipeline: 'nurture',
        current_stage: 'no_show_follow_up'
      })
    }

    await this.queue.send('automation', {
      type: 'booking_no_show',
      booking_id: booking.id,
      contact_id: booking.contact_id,
      tenant_id: context.tenant_id
    })

    return booking
  }

  /**
   * Get available time slots for staff member
   */
  async getAvailability(
    staffId: string,
    date: number, // Start of day timestamp
    duration: number = 60 * 60 * 1000 // Default 1 hour
  ): Promise<AvailabilitySlot[]> {
    const staff = await this.db.staffUsers.get(staffId)
    if (!staff) {
      throw new Error(`Staff member not found: ${staffId}`)
    }

    // Get working hours from staff settings (default 9am-5pm)
    const workStart = staff.settings?.work_hours?.start || 9
    const workEnd = staff.settings?.work_hours?.end || 17

    const dayStart = new Date(date)
    dayStart.setHours(workStart, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(workEnd, 0, 0, 0)

    // Get existing bookings for this day
    const existingBookings = await this.db.bookings.list({
      staff_id: staffId,
      start_time_from: dayStart.getTime(),
      start_time_to: dayEnd.getTime(),
      status: ['confirmed', 'pending']
    })

    // Generate available slots
    const slots: AvailabilitySlot[] = []
    let currentTime = dayStart.getTime()

    while (currentTime + duration <= dayEnd.getTime()) {
      const slotEnd = currentTime + duration

      // Check if slot conflicts with existing booking
      const hasConflict = existingBookings.data.some(booking => {
        return (
          (currentTime >= booking.start_time && currentTime < booking.end_time) ||
          (slotEnd > booking.start_time && slotEnd <= booking.end_time) ||
          (currentTime <= booking.start_time && slotEnd >= booking.end_time)
        )
      })

      if (!hasConflict) {
        slots.push({
          start_time: currentTime,
          end_time: slotEnd,
          staff_id: staffId,
          staff_name: staff.name
        })
      }

      currentTime += duration
    }

    return slots
  }

  /**
   * Check if staff member is available at specific time
   */
  private async checkStaffAvailability(
    staffId: string,
    startTime: number,
    endTime: number
  ): Promise<boolean> {
    const existingBookings = await this.db.bookings.list({
      staff_id: staffId,
      start_time_from: startTime - 24 * 60 * 60 * 1000,
      start_time_to: endTime + 24 * 60 * 60 * 1000,
      status: ['confirmed', 'pending']
    })

    // Check for conflicts
    const hasConflict = existingBookings.data.some(booking => {
      return (
        (startTime >= booking.start_time && startTime < booking.end_time) ||
        (endTime > booking.start_time && endTime <= booking.end_time) ||
        (startTime <= booking.start_time && endTime >= booking.end_time)
      )
    })

    return !hasConflict
  }

  /**
   * Send appointment reminders (called by cron)
   */
  async sendReminders(tenantId: string, hoursAhead: number = 24): Promise<number> {
    const now = Date.now()
    const reminderWindow = now + hoursAhead * 60 * 60 * 1000

    // Find confirmed bookings in reminder window
    const bookings = await this.db.bookings.list({
      tenant_id: tenantId,
      start_time_from: now,
      start_time_to: reminderWindow,
      status: ['confirmed']
    })

    let sent = 0
    for (const booking of bookings.data) {
      // Check if reminder already sent
      if (booking.reminder_sent_at) continue

      const contact = await this.db.contacts.get(booking.contact_id)
      if (!contact) continue

      try {
        await this.queue.send('sms', {
          type: 'booking_reminder',
          contact_id: contact.id,
          booking_id: booking.id,
          phone: contact.phone,
          name: contact.name,
          start_time: booking.start_time,
          service_type: booking.service_type
        })

        await this.db.bookings.update(booking.id, {
          reminder_sent_at: now
        })

        sent++
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error)
      }
    }

    return sent
  }

  /**
   * Get booking analytics for tenant
   */
  async getAnalytics(
    tenantId: string,
    startDate: number,
    endDate: number
  ): Promise<BookingAnalytics> {
    const bookings = await this.db.bookings.list({
      tenant_id: tenantId,
      start_time_from: startDate,
      start_time_to: endDate
    })

    const total = bookings.total
    const confirmed = bookings.data.filter(b => b.status === 'confirmed').length
    const cancelled = bookings.data.filter(b => b.status === 'cancelled').length
    const noShow = bookings.data.filter(b => b.status === 'no_show').length
    const completed = bookings.data.filter(b => b.status === 'completed').length

    const completionRate = total > 0 ? (completed / total) * 100 : 0

    // Calculate average lead time
    const leadTimes = bookings.data
      .filter(b => b.created_at && b.start_time)
      .map(b => (b.start_time - b.created_at) / (1000 * 60 * 60)) // Hours

    const averageLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length
      : 0

    // Most popular service
    const serviceCounts: Record<string, number> = {}
    bookings.data.forEach(b => {
      if (b.service_type) {
        serviceCounts[b.service_type] = (serviceCounts[b.service_type] || 0) + 1
      }
    })

    const mostPopularService = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

    return {
      total_bookings: total,
      confirmed,
      cancelled,
      no_show: noShow,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_lead_time_hours: Math.round(averageLeadTime * 100) / 100,
      most_popular_service: mostPopularService
    }
  }
}
