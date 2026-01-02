/**
 * SavedReportRepository - D1 Implementation
 * Handles saved reports and scheduled reporting
 */

import type { D1Database } from '../types/env'
import type {
  SavedReportRepository,
  CreateSavedReportInput,
  UpdateSavedReportInput
} from '../gateway/DatabaseGateway'
import type { SavedReport } from '../types/entities'
import * as ID from '../utils/id'

export class D1SavedReportRepository implements SavedReportRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateSavedReportInput): Promise<SavedReport> {
    const now = Date.now()
    const id = ID.generateSavedReportId()

    const report: SavedReport = {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
      description: data.description || null,
      report_type: data.report_type,
      parameters: data.parameters,
      schedule: data.schedule || null,
      last_run_at: null,
      next_run_at: null,
      email_recipients: data.email_recipients || [],
      include_ai_insights: data.include_ai_insights !== undefined ? data.include_ai_insights : true,
      ai_focus: data.ai_focus || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now,
      created_by: data.created_by
    }

    await this.db
      .prepare(`
        INSERT INTO saved_reports (
          id, tenant_id, name, description, report_type, parameters,
          schedule, email_recipients, include_ai_insights, ai_focus,
          is_active, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        report.tenant_id,
        report.name,
        report.description,
        report.report_type,
        JSON.stringify(report.parameters),
        report.schedule,
        JSON.stringify(report.email_recipients),
        report.include_ai_insights ? 1 : 0,
        report.ai_focus,
        report.is_active ? 1 : 0,
        report.created_at,
        report.updated_at,
        report.created_by
      )
      .run()

    return report
  }

  async update(id: string, data: UpdateSavedReportInput): Promise<SavedReport> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Saved report not found: ${id}`)
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
    if (data.report_type !== undefined) {
      updates.push('report_type = ?')
      values.push(data.report_type)
    }
    if (data.parameters !== undefined) {
      updates.push('parameters = ?')
      values.push(JSON.stringify(data.parameters))
    }
    if (data.schedule !== undefined) {
      updates.push('schedule = ?')
      values.push(data.schedule)
    }
    if (data.email_recipients !== undefined) {
      updates.push('email_recipients = ?')
      values.push(JSON.stringify(data.email_recipients))
    }
    if (data.include_ai_insights !== undefined) {
      updates.push('include_ai_insights = ?')
      values.push(data.include_ai_insights ? 1 : 0)
    }
    if (data.ai_focus !== undefined) {
      updates.push('ai_focus = ?')
      values.push(data.ai_focus)
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE saved_reports SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as SavedReport
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM saved_reports WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<SavedReport | null> {
    const row = await this.db
      .prepare('SELECT * FROM saved_reports WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId: string): Promise<SavedReport[]> {
    const rows = await this.db
      .prepare('SELECT * FROM saved_reports WHERE tenant_id = ? ORDER BY name ASC')
      .bind(tenantId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findScheduled(now: number): Promise<SavedReport[]> {
    // Find reports that are scheduled and due to run
    const rows = await this.db
      .prepare(`
        SELECT * FROM saved_reports
        WHERE is_active = 1
        AND schedule IS NOT NULL
        AND (next_run_at IS NULL OR next_run_at <= ?)
      `)
      .bind(now)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): SavedReport {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      report_type: row.report_type,
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      schedule: row.schedule,
      last_run_at: row.last_run_at,
      next_run_at: row.next_run_at,
      email_recipients: row.email_recipients ? JSON.parse(row.email_recipients) : [],
      include_ai_insights: row.include_ai_insights === 1,
      ai_focus: row.ai_focus,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    }
  }
}
