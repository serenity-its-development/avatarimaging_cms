/**
 * EmailTemplateRepository - D1 Implementation
 * Handles reusable email templates
 */

import type { D1Database } from '../types/env'
import type {
  EmailTemplateRepository,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput
} from '../gateway/DatabaseGateway'
import type { EmailTemplate } from '../types/entities'
import * as ID from '../utils/id'

export class D1EmailTemplateRepository implements EmailTemplateRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const now = Date.now()
    const id = ID.generateEmailTemplateId()

    const template: EmailTemplate = {
      id,
      tenant_id: data.tenant_id || null,
      name: data.name,
      category: data.category as any,
      subject_template: data.subject_template,
      body_html_template: data.body_html_template,
      body_text_template: data.body_text_template,
      required_variables: data.required_variables || [],
      usage_count: 0,
      ai_generated: data.ai_generated || false,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO email_templates (
          id, tenant_id, name, category, subject_template, body_html_template,
          body_text_template, required_variables, ai_generated, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        template.tenant_id,
        template.name,
        template.category,
        template.subject_template,
        template.body_html_template,
        template.body_text_template,
        JSON.stringify(template.required_variables),
        template.ai_generated ? 1 : 0,
        template.is_active ? 1 : 0,
        template.created_at,
        template.updated_at
      )
      .run()

    return template
  }

  async update(id: string, data: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Email template not found: ${id}`)
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
    if (data.subject_template !== undefined) {
      updates.push('subject_template = ?')
      values.push(data.subject_template)
    }
    if (data.body_html_template !== undefined) {
      updates.push('body_html_template = ?')
      values.push(data.body_html_template)
    }
    if (data.body_text_template !== undefined) {
      updates.push('body_text_template = ?')
      values.push(data.body_text_template)
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
      .prepare(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as EmailTemplate
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM email_templates WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<EmailTemplate | null> {
    const row = await this.db
      .prepare('SELECT * FROM email_templates WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId?: string): Promise<EmailTemplate[]> {
    let query = 'SELECT * FROM email_templates WHERE (tenant_id IS NULL'
    const values: any[] = []

    if (tenantId) {
      query += ' OR tenant_id = ?)'
      values.push(tenantId)
    } else {
      query += ')'
    }

    query += ' ORDER BY name ASC'

    const rows = await this.db.prepare(query).bind(...values).all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByCategory(category: string, tenantId?: string): Promise<EmailTemplate[]> {
    let query = 'SELECT * FROM email_templates WHERE category = ? AND (tenant_id IS NULL'
    const values: any[] = [category]

    if (tenantId) {
      query += ' OR tenant_id = ?)'
      values.push(tenantId)
    } else {
      query += ')'
    }

    query += ' ORDER BY name ASC'

    const rows = await this.db.prepare(query).bind(...values).all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): EmailTemplate {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      category: row.category,
      subject_template: row.subject_template,
      body_html_template: row.body_html_template,
      body_text_template: row.body_text_template,
      required_variables: row.required_variables ? JSON.parse(row.required_variables) : [],
      usage_count: row.usage_count,
      ai_generated: row.ai_generated === 1,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
