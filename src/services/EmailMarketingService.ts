/**
 * EmailMarketingService - AI-powered email campaign management
 * Handles campaign creation, sending, tracking, and analytics
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type {
  EmailCampaign,
  EmailTemplate,
  Contact,
  CreateEmailCampaignInput,
  UpdateEmailCampaignInput,
  CreateEmailTemplateInput
} from '../types/entities'

export interface EmailMarketingServiceContext {
  tenant_id: string
  user_id: string
}

export interface GenerateCampaignRequest {
  campaign_type: string
  target_audience: string
  tone?: 'professional' | 'friendly' | 'urgent'
  key_points?: string[]
  include_cta?: boolean
  cta_text?: string
}

export interface GenerateCampaignResult {
  subject: string
  body_html: string
  body_text: string
  preview_text: string
  ai_cost_usd: number
}

export interface SendCampaignResult {
  campaign_id: string
  recipients_count: number
  queued: boolean
}

export interface CampaignAnalytics {
  campaign_id: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export class EmailMarketingService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  /**
   * Generate email campaign content with AI
   */
  async generateCampaign(
    request: GenerateCampaignRequest,
    context: EmailMarketingServiceContext
  ): Promise<GenerateCampaignResult> {
    const { result, usage } = await this.ai.generateEmailCampaign({
      campaign_type: request.campaign_type,
      target_audience: request.target_audience,
      tone: request.tone || 'professional',
      key_points: request.key_points || [],
      include_cta: request.include_cta !== false,
      cta_text: request.cta_text || 'Book Now'
    })

    // Log AI usage
    await this.db.aiUsageLog.create({
      tenant_id: context.tenant_id,
      model: usage.model,
      use_case: 'email_campaign_generation',
      tokens_used: usage.tokens_used,
      cost_usd: usage.cost_usd,
      input_size: JSON.stringify(request).length,
      output_size: result.body_html.length + result.body_text.length,
      duration_ms: usage.duration_ms,
      metadata: JSON.stringify({ campaign_type: request.campaign_type })
    })

    return {
      subject: result.subject,
      body_html: result.body_html,
      body_text: result.body_text,
      preview_text: result.preview_text,
      ai_cost_usd: usage.cost_usd
    }
  }

  /**
   * Create new email campaign
   */
  async createCampaign(
    data: CreateEmailCampaignInput,
    context: EmailMarketingServiceContext
  ): Promise<EmailCampaign> {
    const campaign = await this.db.emailCampaigns.create(data)

    await this.queue.send('automation', {
      type: 'email_campaign_created',
      campaign_id: campaign.id,
      tenant_id: context.tenant_id,
      created_by: context.user_id
    })

    return campaign
  }

  /**
   * Create campaign with AI generation
   */
  async createCampaignWithAI(
    request: GenerateCampaignRequest & {
      name: string
      segment_filters?: any
      schedule_for?: number
    },
    context: EmailMarketingServiceContext
  ): Promise<{ campaign: EmailCampaign; ai_cost_usd: number }> {
    // Generate content with AI
    const generated = await this.generateCampaign(request, context)

    // Create campaign
    const campaign = await this.db.emailCampaigns.create({
      tenant_id: context.tenant_id,
      name: request.name,
      subject: generated.subject,
      body_html: generated.body_html,
      body_text: generated.body_text,
      segment_filters: request.segment_filters || {},
      status: 'draft',
      schedule_for: request.schedule_for,
      created_by: context.user_id
    })

    return { campaign, ai_cost_usd: generated.ai_cost_usd }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    id: string,
    data: UpdateEmailCampaignInput,
    context: EmailMarketingServiceContext
  ): Promise<EmailCampaign> {
    const campaign = await this.db.emailCampaigns.update(id, data)

    await this.queue.send('automation', {
      type: 'email_campaign_updated',
      campaign_id: campaign.id,
      tenant_id: context.tenant_id,
      changes: Object.keys(data)
    })

    return campaign
  }

  /**
   * Send campaign to recipients
   */
  async sendCampaign(
    campaignId: string,
    context: EmailMarketingServiceContext
  ): Promise<SendCampaignResult> {
    const campaign = await this.db.emailCampaigns.get(campaignId)
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    if (campaign.status === 'sent') {
      throw new Error(`Campaign already sent: ${campaignId}`)
    }

    // Get recipients based on segment filters
    const recipients = await this.getRecipients(campaign)

    if (recipients.length === 0) {
      throw new Error('No recipients found matching segment filters')
    }

    // Update campaign status
    await this.db.emailCampaigns.update(campaignId, {
      status: 'sending',
      sent_at: Date.now()
    })

    // Queue email sends
    for (const contact of recipients) {
      await this.queue.send('email', {
        type: 'campaign_email',
        campaign_id: campaignId,
        contact_id: contact.id,
        to: contact.email,
        subject: campaign.subject,
        body_html: this.personalizeContent(campaign.body_html, contact),
        body_text: this.personalizeContent(campaign.body_text, contact),
        tenant_id: context.tenant_id
      })
    }

    // Update campaign with recipient count
    await this.db.emailCampaigns.update(campaignId, {
      status: 'sent',
      recipients_count: recipients.length
    })

    await this.queue.send('automation', {
      type: 'email_campaign_sent',
      campaign_id: campaignId,
      tenant_id: context.tenant_id,
      recipients_count: recipients.length
    })

    return {
      campaign_id: campaignId,
      recipients_count: recipients.length,
      queued: true
    }
  }

  /**
   * Get campaign recipients based on segment filters
   */
  private async getRecipients(campaign: EmailCampaign): Promise<Contact[]> {
    const filters = campaign.segment_filters || {}

    const params: any = {
      tenant_id: campaign.tenant_id,
      limit: 10000 // Max recipients per campaign
    }

    if (filters.pipeline) {
      params.pipeline = filters.pipeline
    }
    if (filters.stage) {
      params.stage = filters.stage
    }
    if (filters.warmness_min !== undefined) {
      params.warmness_min = filters.warmness_min
    }
    if (filters.warmness_max !== undefined) {
      params.warmness_max = filters.warmness_max
    }
    if (filters.source) {
      params.source = filters.source
    }

    const result = await this.db.contacts.list(params)

    // Filter out contacts without email
    return result.data.filter(contact => contact.email && contact.email.length > 0)
  }

  /**
   * Personalize email content with contact data
   */
  private personalizeContent(content: string, contact: Contact): string {
    let personalized = content

    // Replace common placeholders
    personalized = personalized.replace(/\{\{name\}\}/g, contact.name || 'there')
    personalized = personalized.replace(/\{\{first_name\}\}/g, contact.name?.split(' ')[0] || 'there')
    personalized = personalized.replace(/\{\{phone\}\}/g, contact.phone)
    personalized = personalized.replace(/\{\{email\}\}/g, contact.email || '')

    return personalized
  }

  /**
   * Track email event (open, click, bounce, etc.)
   */
  async trackEvent(
    campaignId: string,
    contactId: string,
    event: 'opened' | 'clicked' | 'bounced' | 'unsubscribed',
    metadata?: any
  ): Promise<void> {
    const campaign = await this.db.emailCampaigns.get(campaignId)
    if (!campaign) return

    // Update campaign analytics
    const updates: any = {}
    if (event === 'opened') {
      updates.opened_count = (campaign.opened_count || 0) + 1
    } else if (event === 'clicked') {
      updates.clicked_count = (campaign.clicked_count || 0) + 1
    } else if (event === 'bounced') {
      updates.bounced_count = (campaign.bounced_count || 0) + 1
    } else if (event === 'unsubscribed') {
      updates.unsubscribed_count = (campaign.unsubscribed_count || 0) + 1
    }

    await this.db.emailCampaigns.update(campaignId, updates)

    // Create touchpoint
    await this.db.touchpoints.create({
      contact_id: contactId,
      touchpoint_type: `email_${event}`,
      channel: 'email',
      direction: 'inbound',
      summary: `Email ${event} - ${campaign.name}`,
      data: { campaign_id: campaignId, event, ...metadata }
    })
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const campaign = await this.db.emailCampaigns.get(campaignId)
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    const sent = campaign.recipients_count || 0
    const delivered = sent - (campaign.bounced_count || 0)
    const opened = campaign.opened_count || 0
    const clicked = campaign.clicked_count || 0
    const bounced = campaign.bounced_count || 0
    const unsubscribed = campaign.unsubscribed_count || 0

    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0

    return {
      campaign_id: campaignId,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      open_rate: Math.round(openRate * 100) / 100,
      click_rate: Math.round(clickRate * 100) / 100,
      bounce_rate: Math.round(bounceRate * 100) / 100
    }
  }

  /**
   * Create email template
   */
  async createTemplate(
    data: CreateEmailTemplateInput,
    context: EmailMarketingServiceContext
  ): Promise<EmailTemplate> {
    return this.db.emailTemplates.create(data)
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return this.db.emailTemplates.get(id)
  }

  /**
   * List templates
   */
  async listTemplates(tenantId: string): Promise<EmailTemplate[]> {
    return this.db.emailTemplates.list(tenantId)
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    return this.db.emailTemplates.delete(id)
  }

  /**
   * Get campaign performance summary for tenant
   */
  async getTenantPerformance(
    tenantId: string,
    startDate: number,
    endDate: number
  ): Promise<{
    total_campaigns: number
    total_sent: number
    total_opened: number
    total_clicked: number
    average_open_rate: number
    average_click_rate: number
    best_performing_campaign: string | null
  }> {
    const campaigns = await this.db.emailCampaigns.list(tenantId)

    // Filter by date range
    const filtered = campaigns.filter(c => {
      return c.sent_at && c.sent_at >= startDate && c.sent_at <= endDate
    })

    const totalCampaigns = filtered.length
    const totalSent = filtered.reduce((sum, c) => sum + (c.recipients_count || 0), 0)
    const totalOpened = filtered.reduce((sum, c) => sum + (c.opened_count || 0), 0)
    const totalClicked = filtered.reduce((sum, c) => sum + (c.clicked_count || 0), 0)

    const averageOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
    const averageClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0

    // Find best performing campaign (by open rate)
    let bestCampaign: EmailCampaign | null = null
    let bestOpenRate = 0

    for (const campaign of filtered) {
      const sent = campaign.recipients_count || 0
      const opened = campaign.opened_count || 0
      const openRate = sent > 0 ? (opened / sent) * 100 : 0

      if (openRate > bestOpenRate) {
        bestOpenRate = openRate
        bestCampaign = campaign
      }
    }

    return {
      total_campaigns: totalCampaigns,
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      average_open_rate: Math.round(averageOpenRate * 100) / 100,
      average_click_rate: Math.round(averageClickRate * 100) / 100,
      best_performing_campaign: bestCampaign?.name || null
    }
  }
}
