/**
 * AutomationRuleRepository - D1 Implementation
 * Handles pipeline automation rules
 */

import type { D1Database } from '../types/env'
import type {
  AutomationRuleRepository,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput
} from '../gateway/DatabaseGateway'
import type { AutomationRule } from '../types/entities'
import * as ID from '../utils/id'

export class D1AutomationRuleRepository implements AutomationRuleRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateAutomationRuleInput): Promise<AutomationRule> {
    const now = Date.now()
    const id = ID.generateAutomationRuleId()

    const rule: AutomationRule = {
      id,
      name: data.name,
      description: data.description || null,
      trigger_type: data.trigger_type as any,
      trigger_config: data.trigger_config,
      pipeline: data.pipeline as any || null,
      stage: data.stage || null,
      action_type: data.action_type as any,
      action_config: data.action_config,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO automation_rules (
          id, name, description, trigger_type, trigger_config, pipeline, stage,
          action_type, action_config, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        rule.name,
        rule.description,
        rule.trigger_type,
        JSON.stringify(rule.trigger_config),
        rule.pipeline,
        rule.stage,
        rule.action_type,
        JSON.stringify(rule.action_config),
        rule.is_active ? 1 : 0,
        rule.created_at,
        rule.updated_at
      )
      .run()

    return rule
  }

  async update(id: string, data: UpdateAutomationRuleInput): Promise<AutomationRule> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Automation rule not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.trigger_type !== undefined) {
      updates.push('trigger_type = ?')
      values.push(data.trigger_type)
    }
    if (data.trigger_config !== undefined) {
      updates.push('trigger_config = ?')
      values.push(JSON.stringify(data.trigger_config))
    }
    if (data.pipeline !== undefined) {
      updates.push('pipeline = ?')
      values.push(data.pipeline)
    }
    if (data.stage !== undefined) {
      updates.push('stage = ?')
      values.push(data.stage)
    }
    if (data.action_type !== undefined) {
      updates.push('action_type = ?')
      values.push(data.action_type)
    }
    if (data.action_config !== undefined) {
      updates.push('action_config = ?')
      values.push(JSON.stringify(data.action_config))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as AutomationRule
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM automation_rules WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<AutomationRule | null> {
    const row = await this.db
      .prepare('SELECT * FROM automation_rules WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId?: string): Promise<AutomationRule[]> {
    // Automation rules are global (no tenant_id)
    const rows = await this.db
      .prepare('SELECT * FROM automation_rules ORDER BY name ASC')
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findActive(pipeline?: string, stage?: string): Promise<AutomationRule[]> {
    let query = 'SELECT * FROM automation_rules WHERE is_active = 1'
    const values: any[] = []

    if (pipeline) {
      query += ' AND (pipeline IS NULL OR pipeline = ?)'
      values.push(pipeline)
    }
    if (stage) {
      query += ' AND (stage IS NULL OR stage = ?)'
      values.push(stage)
    }

    query += ' ORDER BY name ASC'

    const rows = await this.db.prepare(query).bind(...values).all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): AutomationRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger_type: row.trigger_type,
      trigger_config: row.trigger_config ? JSON.parse(row.trigger_config) : {},
      pipeline: row.pipeline,
      stage: row.stage,
      action_type: row.action_type,
      action_config: row.action_config ? JSON.parse(row.action_config) : {},
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
