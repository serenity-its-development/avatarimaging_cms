/**
 * SMSTemplateRepository - D1 Implementation
 * Handles reusable SMS message templates
 */

import type { D1Database } from '../types/env'
import type {
  SMSTemplateRepository,
  CreateSMSTemplateInput,
  UpdateSMSTemplateInput
} from '../gateway/DatabaseGateway'
import type { SMSTemplate } from '../types/entities'
import * as ID from '../utils/id'

export class D1SMSTemplateRepository implements SMSTemplateRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateSMSTemplateInput): Promise<SMSTemplate> {
    const now = Date.now()
    const id = ID.generateSMSTemplateId()

    const template: SMSTemplate = {
      id,
      name: data.name,
      category: data.category as any,
      message_template: data.message_template,
      required_variables: data.required_variables || [],
      usage_count: 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO sms_templates (
          id, name, category, message_template, required_variables,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        template.name,
        template.category,
        template.message_template,
        JSON.stringify(template.required_variables),
        template.is_active ? 1 : 0,
        template.created_at,
        template.updated_at
      )
      .run()

    return template
  }

  async update(id: string, data: UpdateSMSTemplateInput): Promise<SMSTemplate> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`SMS template not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      values.push(data.category)
    }
    if (data.message_template !== undefined) {
      updates.push('message_template = ?')
      values.push(data.message_template)
    }
    if (data.required_variables !== undefined) {
      updates.push('required_variables = ?')
      values.push(JSON.stringify(data.required_variables))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE sms_templates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as SMSTemplate
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM sms_templates WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<SMSTemplate | null> {
    const row = await this.db
      .prepare('SELECT * FROM sms_templates WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId?: string): Promise<SMSTemplate[]> {
    // SMS templates are global (no tenant_id filter)
    const rows = await this.db
      .prepare('SELECT * FROM sms_templates ORDER BY name ASC')
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByCategory(category: string): Promise<SMSTemplate[]> {
    const rows = await this.db
      .prepare('SELECT * FROM sms_templates WHERE category = ? ORDER BY name ASC')
      .bind(category)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async incrementUsage(id: string): Promise<void> {
    await this.db
      .prepare('UPDATE sms_templates SET usage_count = usage_count + 1 WHERE id = ?')
      .bind(id)
      .run()
  }

  private mapRow(row: any): SMSTemplate {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      message_template: row.message_template,
      required_variables: row.required_variables ? JSON.parse(row.required_variables) : [],
      usage_count: row.usage_count,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
