/**
 * ContactRepository - D1 Implementation
 */

import type { D1Database } from '../types/env'
import type {
  ContactRepository,
  CreateContactInput,
  UpdateContactInput,
  ListContactsParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { Contact } from '../types/entities'
import * as ID from '../utils/id'

export class D1ContactRepository implements ContactRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateContactInput): Promise<Contact> {
    const now = Date.now()
    const id = ID.generateContactId()

    const contact: Contact = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      source: data.source,
      current_pipeline: data.current_pipeline as any,
      current_stage: data.current_stage,
      warmness_score: 0,
      warmness_reasoning: null,
      warmness_updated_at: null,
      is_existing_patient: data.is_existing_patient || false,
      data: data.data || {},
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO contacts (
          id, name, phone, email, source, current_pipeline, current_stage,
          warmness_score, is_existing_patient, data, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        contact.name,
        contact.phone,
        contact.email,
        contact.source,
        contact.current_pipeline,
        contact.current_stage,
        contact.warmness_score,
        contact.is_existing_patient ? 1 : 0,
        JSON.stringify(contact.data),
        data.tenant_id,
        contact.created_at,
        contact.updated_at
      )
      .run()

    return contact
  }

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Contact not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?')
      values.push(data.phone)
    }
    if (data.email !== undefined) {
      updates.push('email = ?')
      values.push(data.email)
    }
    if (data.current_pipeline !== undefined) {
      updates.push('current_pipeline = ?')
      values.push(data.current_pipeline)
    }
    if (data.current_stage !== undefined) {
      updates.push('current_stage = ?')
      values.push(data.current_stage)
    }
    if (data.is_existing_patient !== undefined) {
      updates.push('is_existing_patient = ?')
      values.push(data.is_existing_patient ? 1 : 0)
    }
    if (data.data !== undefined) {
      updates.push('data = ?')
      values.push(JSON.stringify(data.data))
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as Contact
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(params: ListContactsParams): Promise<PaginatedResult<Contact>> {
    const { tenant_id, limit = 50, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.pipeline) {
      where.push('current_pipeline = ?')
      values.push(params.pipeline)
    }
    if (params.stage) {
      where.push('current_stage = ?')
      values.push(params.stage)
    }
    if (params.warmness_min !== undefined) {
      where.push('warmness_score >= ?')
      values.push(params.warmness_min)
    }
    if (params.warmness_max !== undefined) {
      where.push('warmness_score <= ?')
      values.push(params.warmness_max)
    }
    if (params.source) {
      where.push('source = ?')
      values.push(params.source)
    }

    const orderBy = params.order_by || 'created_at'
    const orderDir = params.order_dir || 'desc'

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM contacts WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM contacts
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy} ${orderDir}
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

  async findByPhone(phone: string, tenantId: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE phone = ? AND tenant_id = ?')
      .bind(phone, tenantId)
      .first()

    return row ? this.mapRow(row) : null
  }

  async findByEmail(email: string, tenantId: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE email = ? AND tenant_id = ?')
      .bind(email, tenantId)
      .first()

    return row ? this.mapRow(row) : null
  }

  async updateWarmness(id: string, score: number, reasoning?: string): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(`
        UPDATE contacts
        SET warmness_score = ?, warmness_reasoning = ?, warmness_updated_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(score, reasoning || null, now, now, id)
      .run()
  }

  async search(query: string, tenantId: string): Promise<Contact[]> {
    const searchTerm = `%${query}%`
    const rows = await this.db
      .prepare(`
        SELECT * FROM contacts
        WHERE tenant_id = ?
        AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
        ORDER BY warmness_score DESC
        LIMIT 20
      `)
      .bind(tenantId, searchTerm, searchTerm, searchTerm)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): Contact {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      source: row.source,
      current_pipeline: row.current_pipeline,
      current_stage: row.current_stage,
      warmness_score: row.warmness_score,
      warmness_reasoning: row.warmness_reasoning,
      warmness_updated_at: row.warmness_updated_at,
      is_existing_patient: row.is_existing_patient === 1,
      data: row.data ? JSON.parse(row.data) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
