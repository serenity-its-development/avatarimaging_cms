/**
 * TemplateService - Manages message and AI context templates
 * Supports: Email, SMS, Social Media, AI Contexts, Notifications
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import type { AILayer } from '../ai/AILayer'

export interface Template {
  id: string
  tenant_id: string
  name: string
  description?: string
  category: 'email' | 'sms' | 'social' | 'ai_context' | 'notification'
  subject?: string
  body: string
  ai_system_prompt?: string
  ai_temperature?: number
  ai_max_tokens?: number
  variables?: string[]
  quick_button_label?: string
  quick_button_icon?: string
  tags?: string[]
  is_default: boolean
  is_active: boolean
  created_at: number
  updated_at: number
  created_by: string
  last_used_at?: number
  use_count: number
}

export interface CreateTemplateInput {
  name: string
  description?: string
  category: 'email' | 'sms' | 'social' | 'ai_context' | 'notification'
  subject?: string
  body: string
  ai_system_prompt?: string
  ai_temperature?: number
  ai_max_tokens?: number
  variables?: string[]
  quick_button_label?: string
  quick_button_icon?: string
  tags?: string[]
  is_default?: boolean
  tenant_id?: string
}

export interface RenderTemplateInput {
  template_id: string
  variables: Record<string, string>
}

export class TemplateService {
  constructor(
    private db: D1DatabaseGateway,
    private ai?: AILayer
  ) {}

  /**
   * List all templates with optional filtering
   */
  async listTemplates(
    tenantId: string,
    filters?: {
      category?: string
      active_only?: boolean
      with_quick_buttons?: boolean
      search?: string
    }
  ): Promise<Template[]> {
    let query = `
      SELECT * FROM templates
      WHERE tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (filters?.category) {
      query += ` AND category = ?`
      params.push(filters.category)
    }

    if (filters?.active_only) {
      query += ` AND is_active = 1`
    }

    if (filters?.with_quick_buttons) {
      query += ` AND quick_button_label IS NOT NULL`
    }

    if (filters?.search) {
      query += ` AND (name LIKE ? OR description LIKE ? OR body LIKE ?)`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    query += ` ORDER BY is_default DESC, name ASC`

    const result = await this.db.raw(query, params)
    const rows = result.results || []
    return rows.map(this.parseTemplate)
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<Template | null> {
    const result = await this.db.raw(
      `SELECT * FROM templates WHERE id = ?`,
      [id]
    )

    const rows = result.results || []
    if (!rows.length) return null
    return this.parseTemplate(rows[0])
  }

  /**
   * Get default template for a category
   */
  async getDefaultTemplate(
    tenantId: string,
    category: string
  ): Promise<Template | null> {
    const result = await this.db.raw(
      `SELECT * FROM templates
       WHERE tenant_id = ? AND category = ? AND is_default = 1 AND is_active = 1
       LIMIT 1`,
      [tenantId, category]
    )

    const rows = result.results || []
    if (!rows.length) return null
    return this.parseTemplate(rows[0])
  }

  /**
   * Create new template
   */
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const tenantId = input.tenant_id || 'default'
    const now = Date.now()

    // If setting as default, unset other defaults in same category
    if (input.is_default) {
      await this.db.raw(
        `UPDATE templates SET is_default = 0
         WHERE tenant_id = ? AND category = ?`,
        [tenantId, input.category]
      )
    }

    const result = await this.db.raw(
      `INSERT INTO templates (
        tenant_id, name, description, category, subject, body,
        ai_system_prompt, ai_temperature, ai_max_tokens,
        variables, quick_button_label, quick_button_icon, tags,
        is_default, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      RETURNING *`,
      [
        tenantId,
        input.name,
        input.description || null,
        input.category,
        input.subject || null,
        input.body,
        input.ai_system_prompt || null,
        input.ai_temperature || 0.7,
        input.ai_max_tokens || 256,
        input.variables ? JSON.stringify(input.variables) : null,
        input.quick_button_label || null,
        input.quick_button_icon || null,
        input.tags ? JSON.stringify(input.tags) : null,
        input.is_default ? 1 : 0,
        now,
        now,
      ]
    )

    const rows = result.results || []
    if (!rows.length) throw new Error('Failed to create template')
    return this.parseTemplate(rows[0])
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<CreateTemplateInput>
  ): Promise<Template> {
    const now = Date.now()

    // If setting as default, unset other defaults in same category
    if (updates.is_default && updates.category) {
      const existing = await this.getTemplateById(id)
      if (existing) {
        await this.db.raw(
          `UPDATE templates SET is_default = 0
           WHERE tenant_id = ? AND category = ? AND id != ?`,
          [existing.tenant_id, updates.category, id]
        )
      }
    }

    const setClauses: string[] = ['updated_at = ?']
    const params: any[] = [now]

    if (updates.name !== undefined) {
      setClauses.push('name = ?')
      params.push(updates.name)
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?')
      params.push(updates.description)
    }
    if (updates.category !== undefined) {
      setClauses.push('category = ?')
      params.push(updates.category)
    }
    if (updates.subject !== undefined) {
      setClauses.push('subject = ?')
      params.push(updates.subject)
    }
    if (updates.body !== undefined) {
      setClauses.push('body = ?')
      params.push(updates.body)
    }
    if (updates.ai_system_prompt !== undefined) {
      setClauses.push('ai_system_prompt = ?')
      params.push(updates.ai_system_prompt)
    }
    if (updates.ai_temperature !== undefined) {
      setClauses.push('ai_temperature = ?')
      params.push(updates.ai_temperature)
    }
    if (updates.ai_max_tokens !== undefined) {
      setClauses.push('ai_max_tokens = ?')
      params.push(updates.ai_max_tokens)
    }
    if (updates.variables !== undefined) {
      setClauses.push('variables = ?')
      params.push(JSON.stringify(updates.variables))
    }
    if (updates.quick_button_label !== undefined) {
      setClauses.push('quick_button_label = ?')
      params.push(updates.quick_button_label)
    }
    if (updates.quick_button_icon !== undefined) {
      setClauses.push('quick_button_icon = ?')
      params.push(updates.quick_button_icon)
    }
    if (updates.tags !== undefined) {
      setClauses.push('tags = ?')
      params.push(JSON.stringify(updates.tags))
    }
    if (updates.is_default !== undefined) {
      setClauses.push('is_default = ?')
      params.push(updates.is_default ? 1 : 0)
    }

    params.push(id)

    const result = await this.db.raw(
      `UPDATE templates SET ${setClauses.join(', ')}
       WHERE id = ?
       RETURNING *`,
      params
    )

    const rows = result.results || []
    if (!rows.length) throw new Error('Template not found')
    return this.parseTemplate(rows[0])
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.db.raw(
      `UPDATE templates SET is_active = 0, updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    )
  }

  /**
   * Render template with variables
   */
  async renderTemplate(input: RenderTemplateInput): Promise<{
    subject?: string
    body: string
    missing_variables: string[]
  }> {
    const template = await this.getTemplateById(input.template_id)
    if (!template) {
      throw new Error('Template not found')
    }

    // Track usage
    await this.db.raw(
      `UPDATE templates
       SET use_count = use_count + 1, last_used_at = ?
       WHERE id = ?`,
      [Date.now(), input.template_id]
    )

    // Find all variables in template
    const variablePattern = /\{\{(\w+)\}\}/g
    const bodyVariables = [...(template.body.matchAll(variablePattern))].map(m => m[1])
    const subjectVariables = template.subject
      ? [...(template.subject.matchAll(variablePattern))].map(m => m[1])
      : []

    const allVariables = [...new Set([...bodyVariables, ...subjectVariables])]
    const missingVariables = allVariables.filter(v => !(v in input.variables))

    // Replace variables
    let renderedBody = template.body
    let renderedSubject = template.subject

    for (const [key, value] of Object.entries(input.variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      renderedBody = renderedBody.replace(regex, value)
      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(regex, value)
      }
    }

    return {
      subject: renderedSubject,
      body: renderedBody,
      missing_variables: missingVariables,
    }
  }

  /**
   * Execute AI context template
   */
  async executeAITemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<string> {
    if (!this.ai) {
      throw new Error('AI layer not available')
    }

    const template = await this.getTemplateById(templateId)
    if (!template || template.category !== 'ai_context') {
      throw new Error('Invalid AI context template')
    }

    // Render the prompt with variables
    const { body } = await this.renderTemplate({
      template_id: templateId,
      variables,
    })

    // Execute AI with template settings
    const result = await this.ai.generateText(body, {
      systemPrompt: template.ai_system_prompt,
      temperature: template.ai_temperature || 0.7,
      maxTokens: template.ai_max_tokens || 256,
    })

    // Track usage
    await this.db.raw(
      `UPDATE templates
       SET use_count = use_count + 1, last_used_at = ?
       WHERE id = ?`,
      [Date.now(), templateId]
    )

    return result
  }

  /**
   * Get quick action templates (templates with quick buttons)
   */
  async getQuickActionTemplates(
    tenantId: string,
    category?: string
  ): Promise<Template[]> {
    let query = `
      SELECT * FROM templates
      WHERE tenant_id = ?
        AND is_active = 1
        AND quick_button_label IS NOT NULL
    `
    const params: any[] = [tenantId]

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    query += ` ORDER BY use_count DESC, name ASC`

    const result = await this.db.raw(query, params)
    return result.results.map(this.parseTemplate)
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string, newName: string): Promise<Template> {
    const original = await this.getTemplateById(id)
    if (!original) {
      throw new Error('Template not found')
    }

    return this.createTemplate({
      ...original,
      name: newName,
      is_default: false,
    })
  }

  /**
   * Parse template from database row
   */
  private parseTemplate(row: any): Template {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      category: row.category,
      subject: row.subject,
      body: row.body,
      ai_system_prompt: row.ai_system_prompt,
      ai_temperature: row.ai_temperature,
      ai_max_tokens: row.ai_max_tokens,
      variables: row.variables ? JSON.parse(row.variables) : [],
      quick_button_label: row.quick_button_label,
      quick_button_icon: row.quick_button_icon,
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_default: row.is_default === 1,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      last_used_at: row.last_used_at,
      use_count: row.use_count,
    }
  }
}
