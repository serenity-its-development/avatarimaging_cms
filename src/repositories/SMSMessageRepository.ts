/**
 * SMSMessageRepository - D1 Implementation
 * Handles SMS messaging with AI intent detection
 */

import type { D1Database } from '../types/env'
import type {
  SMSMessageRepository,
  CreateSMSMessageInput,
  UpdateSMSMessageInput,
  ListSMSMessagesParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { SMSMessage } from '../types/entities'
import * as ID from '../utils/id'

export class D1SMSMessageRepository implements SMSMessageRepository {
  constructor(private db: D1Database) {}

  /**
   * Find SMS message by provider message ID
   */
  async findByProviderMessageId(providerMessageId: string): Promise<SMSMessage | null> {
    const result = await this.db
      .prepare('SELECT * FROM sms_messages WHERE provider_message_id = ? LIMIT 1')
      .bind(providerMessageId)
      .first()

    if (!result) return null

    return this.mapRow(result)
  }

  async create(data: CreateSMSMessageInput): Promise<SMSMessage> {
    const now = Date.now()
    const id = ID.generateSMSMessageId()

    const sms: SMSMessage = {
      id,
      contact_id: data.contact_id,
      direction: data.direction as any,
      message_body: data.message_body,
      provider: data.provider as any,
      provider_message_id: data.provider_message_id || null,
      status: data.status as any,
      error_message: null,
      detected_intent: null,
      intent_confidence: null,
      cost_cents: data.cost_cents || null,
      automation_rule_id: data.automation_rule_id || null,
      task_id: data.task_id || null,
      created_at: now,
      delivered_at: null
    }

    await this.db
      .prepare(`
        INSERT INTO sms_messages (
          id, contact_id, tenant_id, direction, message_body, provider,
          provider_message_id, status, automation_rule_id, task_id,
          cost_cents, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        sms.contact_id,
        data.tenant_id,
        sms.direction,
        sms.message_body,
        sms.provider,
        sms.provider_message_id,
        sms.status,
        sms.automation_rule_id,
        sms.task_id,
        sms.cost_cents,
        sms.created_at
      )
      .run()

    return sms
  }

  async update(id: string, data: UpdateSMSMessageInput): Promise<SMSMessage> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`SMS message not found: ${id}`)
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.error_message !== undefined) {
      updates.push('error_message = ?')
      values.push(data.error_message)
    }
    if (data.detected_intent !== undefined) {
      updates.push('detected_intent = ?')
      values.push(data.detected_intent)
    }
    if (data.intent_confidence !== undefined) {
      updates.push('intent_confidence = ?')
      values.push(data.intent_confidence)
    }
    if (data.delivered_at !== undefined) {
      updates.push('delivered_at = ?')
      values.push(data.delivered_at)
    }

    if (updates.length === 0) {
      return existing
    }

    values.push(id)

    await this.db
      .prepare(`UPDATE sms_messages SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as SMSMessage
  }

  async get(id: string): Promise<SMSMessage | null> {
    const row = await this.db
      .prepare('SELECT * FROM sms_messages WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(params: ListSMSMessagesParams): Promise<PaginatedResult<SMSMessage>> {
    const { tenant_id, limit = 50, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.contact_id) {
      where.push('contact_id = ?')
      values.push(params.contact_id)
    }
    if (params.direction) {
      where.push('direction = ?')
      values.push(params.direction)
    }
    if (params.status) {
      where.push('status = ?')
      values.push(params.status)
    }

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM sms_messages WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM sms_messages
        WHERE ${where.join(' AND ')}
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

  async findByContact(contactId: string): Promise<SMSMessage[]> {
    const rows = await this.db
      .prepare('SELECT * FROM sms_messages WHERE contact_id = ? ORDER BY created_at DESC')
      .bind(contactId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async updateStatus(id: string, status: string, deliveredAt?: number): Promise<void> {
    if (deliveredAt !== undefined) {
      await this.db
        .prepare('UPDATE sms_messages SET status = ?, delivered_at = ? WHERE id = ?')
        .bind(status, deliveredAt, id)
        .run()
    } else {
      await this.db
        .prepare('UPDATE sms_messages SET status = ? WHERE id = ?')
        .bind(status, id)
        .run()
    }
  }

  private mapRow(row: any): SMSMessage {
    return {
      id: row.id,
      contact_id: row.contact_id,
      direction: row.direction,
      message_body: row.message_body,
      provider: row.provider,
      provider_message_id: row.provider_message_id,
      status: row.status,
      error_message: row.error_message,
      detected_intent: row.detected_intent,
      intent_confidence: row.intent_confidence,
      cost_cents: row.cost_cents,
      automation_rule_id: row.automation_rule_id,
      task_id: row.task_id,
      created_at: row.created_at,
      delivered_at: row.delivered_at
    }
  }
}
