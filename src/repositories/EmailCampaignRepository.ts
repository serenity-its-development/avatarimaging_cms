/**
 * EmailCampaignRepository - D1 Implementation
 * Handles email marketing campaigns with AI generation support
 */

import type { D1Database } from '../types/env'
import type {
  EmailCampaignRepository,
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
  CampaignAnalytics
} from '../gateway/DatabaseGateway'
import type { EmailCampaign } from '../types/entities'
import * as ID from '../utils/id'

export class D1EmailCampaignRepository implements EmailCampaignRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateEmailCampaignInput): Promise<EmailCampaign> {
    const now = Date.now()
    const id = ID.generateEmailCampaignId()

    const campaign: EmailCampaign = {
      id,
      tenant_id: data.tenant_id,
      name: data.name,
      subject: data.subject,
      body_html: data.body_html,
      body_text: data.body_text,
      audience_filters: data.audience_filters,
      status: (data.status || 'draft') as any,
      scheduled_at: data.scheduled_at || null,
      sent_at: null,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      unsubscribed_count: 0,
      ai_generated: data.ai_generated || false,
      ai_prompt: data.ai_prompt || null,
      created_at: now,
      updated_at: now,
      created_by: data.created_by
    }

    await this.db
      .prepare(`
        INSERT INTO email_campaigns (
          id, tenant_id, name, subject, body_html, body_text, audience_filters,
          status, scheduled_at, ai_generated, ai_prompt, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        campaign.tenant_id,
        campaign.name,
        campaign.subject,
        campaign.body_html,
        campaign.body_text,
        JSON.stringify(campaign.audience_filters),
        campaign.status,
        campaign.scheduled_at,
        campaign.ai_generated ? 1 : 0,
        campaign.ai_prompt,
        campaign.created_at,
        campaign.updated_at,
        campaign.created_by
      )
      .run()

    return campaign
  }

  async update(id: string, data: UpdateEmailCampaignInput): Promise<EmailCampaign> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Email campaign not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.subject !== undefined) {
      updates.push('subject = ?')
      values.push(data.subject)
    }
    if (data.body_html !== undefined) {
      updates.push('body_html = ?')
      values.push(data.body_html)
    }
    if (data.body_text !== undefined) {
      updates.push('body_text = ?')
      values.push(data.body_text)
    }
    if (data.audience_filters !== undefined) {
      updates.push('audience_filters = ?')
      values.push(JSON.stringify(data.audience_filters))
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.scheduled_at !== undefined) {
      updates.push('scheduled_at = ?')
      values.push(data.scheduled_at)
    }
    if (data.sent_at !== undefined) {
      updates.push('sent_at = ?')
      values.push(data.sent_at)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE email_campaigns SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as EmailCampaign
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM email_campaigns WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<EmailCampaign | null> {
    const row = await this.db
      .prepare('SELECT * FROM email_campaigns WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId: string): Promise<EmailCampaign[]> {
    const rows = await this.db
      .prepare('SELECT * FROM email_campaigns WHERE tenant_id = ? ORDER BY created_at DESC')
      .bind(tenantId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByStatus(tenantId: string, status: string): Promise<EmailCampaign[]> {
    const rows = await this.db
      .prepare('SELECT * FROM email_campaigns WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC')
      .bind(tenantId, status)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async updateAnalytics(id: string, analytics: CampaignAnalytics): Promise<void> {
    const updates: string[] = []
    const values: any[] = []

    if (analytics.sent_count !== undefined) {
      updates.push('sent_count = ?')
      values.push(analytics.sent_count)
    }
    if (analytics.delivered_count !== undefined) {
      updates.push('delivered_count = ?')
      values.push(analytics.delivered_count)
    }
    if (analytics.opened_count !== undefined) {
      updates.push('opened_count = ?')
      values.push(analytics.opened_count)
    }
    if (analytics.clicked_count !== undefined) {
      updates.push('clicked_count = ?')
      values.push(analytics.clicked_count)
    }
    if (analytics.bounced_count !== undefined) {
      updates.push('bounced_count = ?')
      values.push(analytics.bounced_count)
    }
    if (analytics.unsubscribed_count !== undefined) {
      updates.push('unsubscribed_count = ?')
      values.push(analytics.unsubscribed_count)
    }

    if (updates.length === 0) return

    values.push(id)

    await this.db
      .prepare(`UPDATE email_campaigns SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()
  }

  private mapRow(row: any): EmailCampaign {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      subject: row.subject,
      body_html: row.body_html,
      body_text: row.body_text,
      audience_filters: row.audience_filters ? JSON.parse(row.audience_filters) : {},
      status: row.status,
      scheduled_at: row.scheduled_at,
      sent_at: row.sent_at,
      sent_count: row.sent_count,
      delivered_count: row.delivered_count,
      opened_count: row.opened_count,
      clicked_count: row.clicked_count,
      bounced_count: row.bounced_count,
      unsubscribed_count: row.unsubscribed_count,
      ai_generated: row.ai_generated === 1,
      ai_prompt: row.ai_prompt,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    }
  }
}
