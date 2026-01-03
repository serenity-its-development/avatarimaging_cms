/**
 * AvailabilityRepository - D1 Implementation
 * Handles resource availability windows
 */

import type { D1Database } from '../types/env'
import type {
  ResourceAvailability,
  CalendarRecurrencePattern,
  AvailabilityType,
  ReservationMode,
  CreateAvailabilityInput
} from '../types/resources'
import { generateId } from '../utils/id'

export interface ListAvailabilityParams {
  resource_id?: string
  resource_ids?: string[]
  start_time?: number
  end_time?: number
  availability_type?: AvailabilityType
  limit?: number
  offset?: number
}

export class D1AvailabilityRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateAvailabilityInput): Promise<ResourceAvailability> {
    const now = Date.now()
    const id = generateId('avail')

    const availability: ResourceAvailability = {
      id,
      resource_id: data.resource_id,
      start_time: data.start_time,
      end_time: data.end_time,
      recurrence_pattern: data.recurrence_pattern || null,
      availability_type: data.availability_type,
      reservation_mode_override: data.reservation_mode_override || null,
      max_concurrent_override: data.max_concurrent_override ?? null,
      reason: data.reason || null,
      created_by: null, // Will be set by service
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO resource_availability (
          id, resource_id, start_time, end_time, recurrence_pattern,
          availability_type, reservation_mode_override, max_concurrent_override,
          reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        availability.resource_id,
        availability.start_time,
        availability.end_time,
        availability.recurrence_pattern ? JSON.stringify(availability.recurrence_pattern) : null,
        availability.availability_type,
        availability.reservation_mode_override,
        availability.max_concurrent_override,
        availability.reason,
        availability.created_by,
        availability.created_at,
        availability.updated_at
      )
      .run()

    return availability
  }

  async update(id: string, data: Partial<CreateAvailabilityInput> & { created_by?: string }): Promise<ResourceAvailability> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Availability not found: ${id}`)
    }

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
    if (data.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?')
      values.push(data.recurrence_pattern ? JSON.stringify(data.recurrence_pattern) : null)
    }
    if (data.availability_type !== undefined) {
      updates.push('availability_type = ?')
      values.push(data.availability_type)
    }
    if (data.reservation_mode_override !== undefined) {
      updates.push('reservation_mode_override = ?')
      values.push(data.reservation_mode_override)
    }
    if (data.max_concurrent_override !== undefined) {
      updates.push('max_concurrent_override = ?')
      values.push(data.max_concurrent_override)
    }
    if (data.reason !== undefined) {
      updates.push('reason = ?')
      values.push(data.reason)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db
      .prepare(`UPDATE resource_availability SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as ResourceAvailability
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM resource_availability WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<ResourceAvailability | null> {
    const row = await this.db
      .prepare('SELECT * FROM resource_availability WHERE id = ?')
      .bind(id)
      .first()
    return row ? this.mapRow(row) : null
  }

  async list(params: ListAvailabilityParams): Promise<ResourceAvailability[]> {
    const where: string[] = []
    const values: any[] = []

    if (params.resource_id) {
      where.push('resource_id = ?')
      values.push(params.resource_id)
    }
    if (params.resource_ids && params.resource_ids.length > 0) {
      const placeholders = params.resource_ids.map(() => '?').join(', ')
      where.push(`resource_id IN (${placeholders})`)
      values.push(...params.resource_ids)
    }
    if (params.start_time !== undefined) {
      // Include availability that ends after the start time
      where.push('end_time >= ?')
      values.push(params.start_time)
    }
    if (params.end_time !== undefined) {
      // Include availability that starts before the end time
      where.push('start_time <= ?')
      values.push(params.end_time)
    }
    if (params.availability_type) {
      where.push('availability_type = ?')
      values.push(params.availability_type)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    let query = `SELECT * FROM resource_availability ${whereClause} ORDER BY start_time`

    if (params.limit) {
      query += ` LIMIT ${params.limit}`
      if (params.offset) {
        query += ` OFFSET ${params.offset}`
      }
    }

    const rows = await this.db.prepare(query).bind(...values).all()
    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async getForResource(resourceId: string, startTime: number, endTime: number): Promise<ResourceAvailability[]> {
    return this.list({
      resource_id: resourceId,
      start_time: startTime,
      end_time: endTime
    })
  }

  async getForResources(resourceIds: string[], startTime: number, endTime: number): Promise<ResourceAvailability[]> {
    if (resourceIds.length === 0) return []

    return this.list({
      resource_ids: resourceIds,
      start_time: startTime,
      end_time: endTime
    })
  }

  async deleteForResource(resourceId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM resource_availability WHERE resource_id = ?')
      .bind(resourceId)
      .run()
  }

  async getBlockedPeriods(resourceId: string, startTime: number, endTime: number): Promise<ResourceAvailability[]> {
    return this.list({
      resource_id: resourceId,
      start_time: startTime,
      end_time: endTime,
      availability_type: 'blocked'
    })
  }

  async getAvailablePeriods(resourceId: string, startTime: number, endTime: number): Promise<ResourceAvailability[]> {
    return this.list({
      resource_id: resourceId,
      start_time: startTime,
      end_time: endTime,
      availability_type: 'available'
    })
  }

  private mapRow(row: any): ResourceAvailability {
    return {
      id: row.id,
      resource_id: row.resource_id,
      start_time: row.start_time,
      end_time: row.end_time,
      recurrence_pattern: row.recurrence_pattern ? JSON.parse(row.recurrence_pattern) : null,
      availability_type: row.availability_type as AvailabilityType,
      reservation_mode_override: row.reservation_mode_override as ReservationMode | null,
      max_concurrent_override: row.max_concurrent_override,
      reason: row.reason,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
