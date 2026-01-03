/**
 * AppointmentRepository - D1 Implementation
 * Handles procedure slots, appointments, preferences, and resource assignments
 */

import type { D1Database } from '../types/env'
import type {
  ProcedureSlot,
  Appointment,
  AppointmentPreference,
  AppointmentResource,
  AppointmentWithDetails,
  AppointmentStatus,
  SlotStatus,
  SlotGenerationType,
  PreferenceType,
  ReservationMode,
  AppointmentResourceStatus,
  CalendarRecurrencePattern,
  CreateAppointmentInput
} from '../types/resources'
import { generateId } from '../utils/id'

export interface ListSlotsParams {
  procedure_id?: string
  tenant_id?: string
  status?: SlotStatus
  start_time?: number
  end_time?: number
  limit?: number
  offset?: number
}

export interface ListAppointmentsParams {
  contact_id?: string
  tenant_id?: string
  status?: AppointmentStatus
  start_time?: number
  end_time?: number
  limit?: number
  offset?: number
}

export interface CreateSlotInput {
  procedure_id: string
  start_time: number
  end_time: number
  status?: SlotStatus
  recurrence_pattern?: CalendarRecurrencePattern
  parent_slot_id?: string
  generation_type?: SlotGenerationType
  tenant_id?: string
  notes?: string
  created_by?: string
}

export class D1AppointmentRepository {
  constructor(private db: D1Database) {}

  // =====================================================================
  // PROCEDURE SLOTS
  // =====================================================================

  async createSlot(data: CreateSlotInput): Promise<ProcedureSlot> {
    const now = Date.now()
    const id = generateId('slot')

    const slot: ProcedureSlot = {
      id,
      procedure_id: data.procedure_id,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status || 'available',
      recurrence_pattern: data.recurrence_pattern || null,
      parent_slot_id: data.parent_slot_id || null,
      generation_type: data.generation_type || 'auto',
      tenant_id: data.tenant_id || null,
      notes: data.notes || null,
      created_by: data.created_by || null,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO procedure_slots (
          id, procedure_id, start_time, end_time, status,
          recurrence_pattern, parent_slot_id, generation_type,
          tenant_id, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        slot.procedure_id,
        slot.start_time,
        slot.end_time,
        slot.status,
        slot.recurrence_pattern ? JSON.stringify(slot.recurrence_pattern) : null,
        slot.parent_slot_id,
        slot.generation_type,
        slot.tenant_id,
        slot.notes,
        slot.created_by,
        slot.created_at,
        slot.updated_at
      )
      .run()

    return slot
  }

  async updateSlot(id: string, data: Partial<CreateSlotInput>): Promise<ProcedureSlot> {
    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.start_time !== undefined) {
      updates.push('start_time = ?')
      values.push(data.start_time)
    }
    if (data.end_time !== undefined) {
      updates.push('end_time = ?')
      values.push(data.end_time)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db
      .prepare(`UPDATE procedure_slots SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.getSlot(id)) as ProcedureSlot
  }

  async deleteSlot(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM procedure_slots WHERE id = ?').bind(id).run()
  }

  async getSlot(id: string): Promise<ProcedureSlot | null> {
    const row = await this.db
      .prepare('SELECT * FROM procedure_slots WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapSlot(row) : null
  }

  async listSlots(params: ListSlotsParams): Promise<ProcedureSlot[]> {
    const where: string[] = []
    const values: any[] = []

    if (params.procedure_id) {
      where.push('procedure_id = ?')
      values.push(params.procedure_id)
    }
    if (params.tenant_id) {
      where.push('tenant_id = ?')
      values.push(params.tenant_id)
    }
    if (params.status) {
      where.push('status = ?')
      values.push(params.status)
    }
    if (params.start_time !== undefined) {
      where.push('end_time >= ?')
      values.push(params.start_time)
    }
    if (params.end_time !== undefined) {
      where.push('start_time <= ?')
      values.push(params.end_time)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    let query = `SELECT * FROM procedure_slots ${whereClause} ORDER BY start_time`

    if (params.limit) {
      query += ` LIMIT ${params.limit}`
      if (params.offset) {
        query += ` OFFSET ${params.offset}`
      }
    }

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapSlot(row)) : []
  }

  async getAvailableSlots(procedureId: string, startTime: number, endTime: number, tenantId?: string): Promise<ProcedureSlot[]> {
    return this.listSlots({
      procedure_id: procedureId,
      tenant_id: tenantId,
      status: 'available',
      start_time: startTime,
      end_time: endTime
    })
  }

  async updateSlotStatus(id: string, status: SlotStatus): Promise<void> {
    await this.db
      .prepare('UPDATE procedure_slots SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, Date.now(), id)
      .run()
  }

  // =====================================================================
  // APPOINTMENTS
  // =====================================================================

  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    const now = Date.now()
    const id = generateId('appt')

    const appointment: Appointment = {
      id,
      procedure_slot_id: data.procedure_slot_id,
      contact_id: data.contact_id || null,
      status: 'scheduled',
      notes: data.notes || null,
      created_by: null, // Will be set by service
      created_at: now,
      updated_at: now,
      cancelled_at: null,
      completed_at: null
    }

    await this.db
      .prepare(`
        INSERT INTO appointments (
          id, procedure_slot_id, contact_id, status, notes,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        appointment.procedure_slot_id,
        appointment.contact_id,
        appointment.status,
        appointment.notes,
        appointment.created_by,
        appointment.created_at,
        appointment.updated_at
      )
      .run()

    // Mark slot as booked
    await this.updateSlotStatus(data.procedure_slot_id, 'booked')

    // Add preferences if provided
    if (data.preferences && data.preferences.length > 0) {
      for (let i = 0; i < data.preferences.length; i++) {
        const pref = data.preferences[i]
        await this.addPreference(id, pref.role_id, pref.resource_id, pref.preference_type, i)
      }
    }

    return appointment
  }

  async updateAppointment(id: string, data: Partial<{
    status: AppointmentStatus
    notes: string
    contact_id: string
  }>): Promise<Appointment> {
    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)

      if (data.status === 'cancelled') {
        updates.push('cancelled_at = ?')
        values.push(now)
      } else if (data.status === 'completed') {
        updates.push('completed_at = ?')
        values.push(now)
      }
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes)
    }
    if (data.contact_id !== undefined) {
      updates.push('contact_id = ?')
      values.push(data.contact_id)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db
      .prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    // If cancelled, free up the slot
    if (data.status === 'cancelled') {
      const appointment = await this.getAppointment(id)
      if (appointment) {
        await this.updateSlotStatus(appointment.procedure_slot_id, 'available')
      }
    }

    return (await this.getAppointment(id)) as Appointment
  }

  async deleteAppointment(id: string): Promise<void> {
    const appointment = await this.getAppointment(id)
    if (appointment) {
      // Free up the slot
      await this.updateSlotStatus(appointment.procedure_slot_id, 'available')
    }
    await this.db.prepare('DELETE FROM appointments WHERE id = ?').bind(id).run()
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const row = await this.db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapAppointment(row) : null
  }

  async getAppointmentBySlot(slotId: string): Promise<Appointment | null> {
    const row = await this.db
      .prepare('SELECT * FROM appointments WHERE procedure_slot_id = ?')
      .bind(slotId)
      .first()
    return row ? this.mapAppointment(row) : null
  }

  async listAppointments(params: ListAppointmentsParams): Promise<Appointment[]> {
    const where: string[] = []
    const values: any[] = []

    if (params.contact_id) {
      where.push('a.contact_id = ?')
      values.push(params.contact_id)
    }
    if (params.status) {
      where.push('a.status = ?')
      values.push(params.status)
    }
    if (params.start_time !== undefined || params.end_time !== undefined || params.tenant_id) {
      // Need to join with slots for time/tenant filtering
    }

    let query = `
      SELECT a.* FROM appointments a
      JOIN procedure_slots ps ON a.procedure_slot_id = ps.id
    `

    if (params.tenant_id) {
      where.push('ps.tenant_id = ?')
      values.push(params.tenant_id)
    }
    if (params.start_time !== undefined) {
      where.push('ps.end_time >= ?')
      values.push(params.start_time)
    }
    if (params.end_time !== undefined) {
      where.push('ps.start_time <= ?')
      values.push(params.end_time)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    query += ` ${whereClause} ORDER BY ps.start_time`

    if (params.limit) {
      query += ` LIMIT ${params.limit}`
      if (params.offset) {
        query += ` OFFSET ${params.offset}`
      }
    }

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapAppointment(row)) : []
  }

  async getAppointmentWithDetails(id: string): Promise<AppointmentWithDetails | null> {
    const appointment = await this.getAppointment(id)
    if (!appointment) return null

    // Get slot
    const slot = await this.getSlot(appointment.procedure_slot_id)
    if (!slot) return null

    // Get procedure
    const procRow = await this.db
      .prepare('SELECT * FROM procedures WHERE id = ?')
      .bind(slot.procedure_id)
      .first()

    // Get contact
    let contact: any = undefined
    if (appointment.contact_id) {
      const contactRow = await this.db
        .prepare('SELECT id, name, phone, email FROM contacts WHERE id = ?')
        .bind(appointment.contact_id)
        .first()
      if (contactRow) {
        contact = {
          id: contactRow.id as string,
          name: contactRow.name as string,
          phone: contactRow.phone as string,
          email: contactRow.email as string | null
        }
      }
    }

    // Get preferences
    const preferences = await this.getPreferencesWithDetails(id)

    // Get resources
    const resources = await this.getResourcesWithDetails(id)

    return {
      ...appointment,
      procedure_slot: slot,
      procedure: {
        id: procRow!.id as string,
        code: procRow!.code as string,
        name: procRow!.name as string,
        description: procRow!.description as string | null,
        procedure_type: procRow!.procedure_type as any,
        duration_minutes: procRow!.duration_minutes as number | null,
        buffer_before_minutes: procRow!.buffer_before_minutes as number,
        buffer_after_minutes: procRow!.buffer_after_minutes as number,
        color: procRow!.color as string | null,
        tenant_id: procRow!.tenant_id as string | null,
        is_active: Boolean(procRow!.is_active),
        created_at: procRow!.created_at as number,
        updated_at: procRow!.updated_at as number
      },
      contact,
      preferences,
      resources
    }
  }

  // =====================================================================
  // APPOINTMENT PREFERENCES
  // =====================================================================

  async addPreference(appointmentId: string, roleId: string, resourceId: string, preferenceType: PreferenceType, priority = 0): Promise<AppointmentPreference> {
    const id = generateId('apptpref')
    const now = Date.now()

    await this.db
      .prepare(`
        INSERT INTO appointment_preferences (id, appointment_id, role_id, resource_id, preference_type, priority, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, appointmentId, roleId, resourceId, preferenceType, priority, now)
      .run()

    return {
      id,
      appointment_id: appointmentId,
      role_id: roleId,
      resource_id: resourceId,
      preference_type: preferenceType,
      priority,
      created_at: now
    }
  }

  async removePreference(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM appointment_preferences WHERE id = ?').bind(id).run()
  }

  async getPreferences(appointmentId: string): Promise<AppointmentPreference[]> {
    const rows = await this.db
      .prepare('SELECT * FROM appointment_preferences WHERE appointment_id = ? ORDER BY priority')
      .bind(appointmentId)
      .all()

    return rows.results ? rows.results.map(row => ({
      id: row.id as string,
      appointment_id: row.appointment_id as string,
      role_id: row.role_id as string,
      resource_id: row.resource_id as string,
      preference_type: row.preference_type as PreferenceType,
      priority: row.priority as number,
      created_at: row.created_at as number
    })) : []
  }

  async getPreferencesWithDetails(appointmentId: string): Promise<any[]> {
    const rows = await this.db
      .prepare(`
        SELECT ap.*,
               rr.code as role_code, rr.name as role_name,
               r.name as resource_name, r.resource_type_id
        FROM appointment_preferences ap
        JOIN resource_roles rr ON ap.role_id = rr.id
        JOIN resources r ON ap.resource_id = r.id
        WHERE ap.appointment_id = ?
        ORDER BY ap.priority
      `)
      .bind(appointmentId)
      .all()

    return rows.results || []
  }

  // =====================================================================
  // APPOINTMENT RESOURCES
  // =====================================================================

  async assignResource(data: {
    appointment_id: string
    resource_id: string
    role_id: string
    reserved_start: number
    reserved_end: number
    reservation_mode: ReservationMode
    quantity_consumed?: number
    notes?: string
  }): Promise<AppointmentResource> {
    const id = generateId('apptres')
    const now = Date.now()

    const resource: AppointmentResource = {
      id,
      appointment_id: data.appointment_id,
      resource_id: data.resource_id,
      role_id: data.role_id,
      reserved_start: data.reserved_start,
      reserved_end: data.reserved_end,
      reservation_mode: data.reservation_mode,
      status: 'assigned',
      quantity_consumed: data.quantity_consumed ?? null,
      notes: data.notes || null,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO appointment_resources (
          id, appointment_id, resource_id, role_id,
          reserved_start, reserved_end, reservation_mode, status,
          quantity_consumed, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        resource.appointment_id,
        resource.resource_id,
        resource.role_id,
        resource.reserved_start,
        resource.reserved_end,
        resource.reservation_mode,
        resource.status,
        resource.quantity_consumed,
        resource.notes,
        resource.created_at,
        resource.updated_at
      )
      .run()

    return resource
  }

  async updateResourceStatus(id: string, status: AppointmentResourceStatus): Promise<void> {
    await this.db
      .prepare('UPDATE appointment_resources SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, Date.now(), id)
      .run()
  }

  async unassignResource(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM appointment_resources WHERE id = ?').bind(id).run()
  }

  async getAppointmentResources(appointmentId: string): Promise<AppointmentResource[]> {
    const rows = await this.db
      .prepare('SELECT * FROM appointment_resources WHERE appointment_id = ?')
      .bind(appointmentId)
      .all()

    return rows.results ? rows.results.map(row => this.mapAppointmentResource(row)) : []
  }

  async getResourcesWithDetails(appointmentId: string): Promise<any[]> {
    const rows = await this.db
      .prepare(`
        SELECT ar.*,
               rr.code as role_code, rr.name as role_name,
               r.name as resource_name, r.resource_type_id
        FROM appointment_resources ar
        JOIN resource_roles rr ON ar.role_id = rr.id
        JOIN resources r ON ar.resource_id = r.id
        WHERE ar.appointment_id = ?
      `)
      .bind(appointmentId)
      .all()

    return rows.results || []
  }

  async getResourceReservations(resourceId: string, startTime: number, endTime: number): Promise<AppointmentResource[]> {
    const rows = await this.db
      .prepare(`
        SELECT ar.* FROM appointment_resources ar
        JOIN appointments a ON ar.appointment_id = a.id
        WHERE ar.resource_id = ?
          AND ar.reserved_end >= ?
          AND ar.reserved_start <= ?
          AND a.status NOT IN ('cancelled', 'no_show')
      `)
      .bind(resourceId, startTime, endTime)
      .all()

    return rows.results ? rows.results.map(row => this.mapAppointmentResource(row)) : []
  }

  async countConcurrentReservations(resourceId: string, startTime: number, endTime: number): Promise<number> {
    const result = await this.db
      .prepare(`
        SELECT COUNT(*) as count FROM appointment_resources ar
        JOIN appointments a ON ar.appointment_id = a.id
        WHERE ar.resource_id = ?
          AND ar.reserved_end > ?
          AND ar.reserved_start < ?
          AND a.status NOT IN ('cancelled', 'no_show')
      `)
      .bind(resourceId, startTime, endTime)
      .first<{ count: number }>()

    return result?.count || 0
  }

  // =====================================================================
  // MAPPERS
  // =====================================================================

  private mapSlot(row: any): ProcedureSlot {
    return {
      id: row.id,
      procedure_id: row.procedure_id,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status as SlotStatus,
      recurrence_pattern: row.recurrence_pattern ? JSON.parse(row.recurrence_pattern) : null,
      parent_slot_id: row.parent_slot_id,
      generation_type: row.generation_type as SlotGenerationType,
      tenant_id: row.tenant_id,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  private mapAppointment(row: any): Appointment {
    return {
      id: row.id,
      procedure_slot_id: row.procedure_slot_id,
      contact_id: row.contact_id,
      status: row.status as AppointmentStatus,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cancelled_at: row.cancelled_at,
      completed_at: row.completed_at
    }
  }

  private mapAppointmentResource(row: any): AppointmentResource {
    return {
      id: row.id,
      appointment_id: row.appointment_id,
      resource_id: row.resource_id,
      role_id: row.role_id,
      reserved_start: row.reserved_start,
      reserved_end: row.reserved_end,
      reservation_mode: row.reservation_mode as ReservationMode,
      status: row.status as AppointmentResourceStatus,
      quantity_consumed: row.quantity_consumed,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
