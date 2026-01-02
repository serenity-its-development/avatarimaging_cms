/**
 * BookingRepository - D1 Implementation
 */

import type { D1Database } from '../types/env'
import type {
  BookingRepository,
  CreateBookingInput,
  UpdateBookingInput,
  ListBookingsParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { Booking } from '../types/entities'
import * as ID from '../utils/id'

export class D1BookingRepository implements BookingRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateBookingInput): Promise<Booking> {
    const now = Date.now()
    const id = ID.generateBookingId()

    const booking: Booking = {
      id,
      contact_id: data.contact_id,
      wix_booking_id: data.wix_booking_id || null,
      service_name: data.service_name,
      location: data.location,
      appointment_datetime: data.appointment_datetime,
      status: data.status as any,
      assigned_staff_id: data.assigned_staff_id || null,
      notes: data.notes || null,
      data: data.data || {},
      created_at: now,
      updated_at: now,
      completed_at: null
    }

    await this.db
      .prepare(`
        INSERT INTO bookings (
          id, contact_id, tenant_id, wix_booking_id, service_name, location,
          appointment_datetime, status, assigned_staff_id, notes, data,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        booking.contact_id,
        data.tenant_id,
        booking.wix_booking_id,
        booking.service_name,
        booking.location,
        booking.appointment_datetime,
        booking.status,
        booking.assigned_staff_id,
        booking.notes,
        JSON.stringify(booking.data),
        booking.created_at,
        booking.updated_at
      )
      .run()

    return booking
  }

  async update(id: string, data: UpdateBookingInput): Promise<Booking> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Booking not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.service_name !== undefined) {
      updates.push('service_name = ?')
      values.push(data.service_name)
    }
    if (data.location !== undefined) {
      updates.push('location = ?')
      values.push(data.location)
    }
    if (data.appointment_datetime !== undefined) {
      updates.push('appointment_datetime = ?')
      values.push(data.appointment_datetime)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.assigned_staff_id !== undefined) {
      updates.push('assigned_staff_id = ?')
      values.push(data.assigned_staff_id)
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?')
      values.push(data.notes)
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?')
      values.push(data.completed_at)
    }
    if (data.data !== undefined) {
      updates.push('data = ?')
      values.push(JSON.stringify(data.data))
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as Booking
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<Booking | null> {
    const row = await this.db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(params: ListBookingsParams): Promise<PaginatedResult<Booking>> {
    const { tenant_id, limit = 50, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.contact_id) {
      where.push('contact_id = ?')
      values.push(params.contact_id)
    }
    if (params.status) {
      where.push('status = ?')
      values.push(params.status)
    }
    if (params.start_date) {
      where.push('appointment_datetime >= ?')
      values.push(params.start_date)
    }
    if (params.end_date) {
      where.push('appointment_datetime <= ?')
      values.push(params.end_date)
    }
    if (params.assigned_staff_id) {
      where.push('assigned_staff_id = ?')
      values.push(params.assigned_staff_id)
    }

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM bookings WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM bookings
        WHERE ${where.join(' AND ')}
        ORDER BY appointment_datetime ASC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, limit, offset)
      .all()

    const data = rows.results ? rows.results.map(row => this.mapRow(row)) : []

    return {
      data,
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  }

  async findByContact(contactId: string): Promise<Booking[]> {
    const rows = await this.db
      .prepare('SELECT * FROM bookings WHERE contact_id = ? ORDER BY appointment_datetime DESC')
      .bind(contactId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByDateRange(tenantId: string, startDate: number, endDate: number): Promise<Booking[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM bookings
        WHERE tenant_id = ? AND appointment_datetime >= ? AND appointment_datetime <= ?
        ORDER BY appointment_datetime ASC
      `)
      .bind(tenantId, startDate, endDate)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, id)
      .run()
  }

  async assignStaff(id: string, staffId: string): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare('UPDATE bookings SET assigned_staff_id = ?, updated_at = ? WHERE id = ?')
      .bind(staffId, now, id)
      .run()
  }

  private mapRow(row: any): Booking {
    return {
      id: row.id,
      contact_id: row.contact_id,
      wix_booking_id: row.wix_booking_id,
      service_name: row.service_name,
      location: row.location,
      appointment_datetime: row.appointment_datetime,
      status: row.status,
      assigned_staff_id: row.assigned_staff_id,
      notes: row.notes,
      data: row.data ? JSON.parse(row.data) : {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at
    }
  }
}
