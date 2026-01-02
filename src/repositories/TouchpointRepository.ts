/**
 * TouchpointRepository - D1 Implementation
 * Tracks all contact interactions for multi-touch attribution
 */

import type { D1Database } from '../types/env'
import type {
  TouchpointRepository,
  CreateTouchpointInput
} from '../gateway/DatabaseGateway'
import type { Touchpoint } from '../types/entities'
import * as ID from '../utils/id'

export class D1TouchpointRepository implements TouchpointRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateTouchpointInput): Promise<Touchpoint> {
    const now = Date.now()
    const id = ID.generateTouchpointId()

    const touchpoint: Touchpoint = {
      id,
      contact_id: data.contact_id,
      type: data.type as any,
      channel: data.channel as any,
      direction: data.direction as any,
      summary: data.summary || null,
      details: data.details || null,
      campaign_id: data.campaign_id || null,
      created_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO touchpoints (
          id, contact_id, type, channel, direction, summary, details, campaign_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        touchpoint.contact_id,
        touchpoint.type,
        touchpoint.channel,
        touchpoint.direction,
        touchpoint.summary,
        touchpoint.details,
        touchpoint.campaign_id,
        touchpoint.created_at
      )
      .run()

    return touchpoint
  }

  async list(contactId: string): Promise<Touchpoint[]> {
    const rows = await this.db
      .prepare('SELECT * FROM touchpoints WHERE contact_id = ? ORDER BY created_at DESC')
      .bind(contactId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async listRecent(tenantId: string, limit: number): Promise<Touchpoint[]> {
    // Get recent touchpoints across all contacts in this tenant
    const rows = await this.db
      .prepare(`
        SELECT t.* FROM touchpoints t
        JOIN contacts c ON t.contact_id = c.id
        WHERE c.tenant_id = ?
        ORDER BY t.created_at DESC
        LIMIT ?
      `)
      .bind(tenantId, limit)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): Touchpoint {
    return {
      id: row.id,
      contact_id: row.contact_id,
      type: row.type,
      channel: row.channel,
      direction: row.direction,
      summary: row.summary,
      details: row.details,
      campaign_id: row.campaign_id,
      created_at: row.created_at
    }
  }
}
