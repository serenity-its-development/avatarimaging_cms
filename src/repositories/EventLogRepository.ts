/**
 * EventLogRepository - D1 Implementation
 * Handles general system event logging
 */

import type { D1Database } from '../types/env'
import type {
  EventLogRepository,
  CreateEventLogInput,
  ListEventLogsParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { EventLog } from '../types/entities'
import * as ID from '../utils/id'

export class D1EventLogRepository implements EventLogRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateEventLogInput): Promise<EventLog> {
    const now = Date.now()
    const id = ID.generateEventLogId()

    const event: EventLog = {
      id,
      event_type: data.event_type,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      actor_type: data.actor_type,
      actor_id: data.actor_id || null,
      summary: data.summary || null,
      details: data.details || null,
      status: data.status,
      error_message: data.error_message || null,
      created_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO event_log (
          id, event_type, entity_type, entity_id, actor_type, actor_id,
          summary, details, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        event.event_type,
        event.entity_type,
        event.entity_id,
        event.actor_type,
        event.actor_id,
        event.summary,
        event.details,
        event.status,
        event.error_message,
        event.created_at
      )
      .run()

    return event
  }

  async list(params: ListEventLogsParams): Promise<PaginatedResult<EventLog>> {
    const { limit = 100, offset = 0 } = params
    const where: string[] = []
    const values: any[] = []

    if (params.event_type) {
      where.push('event_type = ?')
      values.push(params.event_type)
    }
    if (params.entity_type) {
      where.push('entity_type = ?')
      values.push(params.entity_type)
    }
    if (params.entity_id) {
      where.push('entity_id = ?')
      values.push(params.entity_id)
    }
    if (params.actor_id) {
      where.push('actor_id = ?')
      values.push(params.actor_id)
    }
    if (params.status) {
      where.push('status = ?')
      values.push(params.status)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM event_log ${whereClause}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM event_log
        ${whereClause}
        ORDER BY created_at DESC
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

  async findByEntity(entityType: string, entityId: string): Promise<EventLog[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM event_log
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY created_at DESC
      `)
      .bind(entityType, entityId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): EventLog {
    return {
      id: row.id,
      event_type: row.event_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      summary: row.summary,
      details: row.details,
      status: row.status,
      error_message: row.error_message,
      created_at: row.created_at
    }
  }
}
