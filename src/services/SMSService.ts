/**
 * SMSService - SMS sending and receiving with AI intent detection
 * Integrates with ClickSend API for SMS delivery
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type {
  SMSMessage,
  Contact,
  SMSTemplate,
  CreateSMSMessageInput,
  CreateSMSTemplateInput
} from '../types/entities'

export interface SMSServiceContext {
  tenant_id: string
  user_id?: string
}

export interface SendSMSRequest {
  contact_id: string
  message: string
  template_id?: string
  scheduled_for?: number
}

export interface SendSMSResult {
  sms_id: string
  sent: boolean
  clicksend_message_id?: string
  cost_usd?: number
}

export interface IncomingSMSPayload {
  from: string
  to: string
  message: string
  received_at: number
  clicksend_message_id?: string
}

export interface ProcessIncomingSMSResult {
  contact: Contact
  sms_message: SMSMessage
  intent_detected: string
  action_taken?: string
  ai_cost_usd: number
}

export class SMSService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  /**
   * Send SMS to contact
   */
  async send(
    request: SendSMSRequest,
    context: SMSServiceContext
  ): Promise<SendSMSResult> {
    const contact = await this.db.contacts.get(request.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${request.contact_id}`)
    }

    // Get message from template if provided
    let message = request.message
    if (request.template_id) {
      const template = await this.db.smsTemplates.get(request.template_id)
      if (!template) {
        throw new Error(`SMS template not found: ${request.template_id}`)
      }

      // Interpolate template variables
      message = this.interpolateTemplate(template.message_template, contact)

      // Increment template usage
      await this.db.smsTemplates.incrementUsage(request.template_id)
    }

    // Create SMS message record
    const sms = await this.db.smsMessages.create({
      contact_id: request.contact_id,
      direction: 'outbound',
      message,
      status: request.scheduled_for ? 'scheduled' : 'pending',
      scheduled_for: request.scheduled_for
    })

    // Queue for sending (or schedule)
    if (request.scheduled_for) {
      // TODO: Queue for scheduled sending
      await this.queue.send('sms_scheduled', {
        sms_id: sms.id,
        send_at: request.scheduled_for,
        tenant_id: context.tenant_id
      })
    } else {
      // Send immediately via ClickSend
      await this.queue.send('sms', {
        type: 'send',
        sms_id: sms.id,
        phone: contact.phone,
        message,
        tenant_id: context.tenant_id
      })
    }

    // Create touchpoint
    await this.db.touchpoints.create({
      contact_id: request.contact_id,
      touchpoint_type: 'sms_sent',
      channel: 'sms',
      direction: 'outbound',
      summary: message.substring(0, 100),
      data: { sms_id: sms.id, template_id: request.template_id }
    })

    return {
      sms_id: sms.id,
      sent: !request.scheduled_for // True if sent immediately
    }
  }

  /**
   * Process incoming SMS with AI intent detection
   */
  async processIncoming(
    payload: IncomingSMSPayload,
    context: SMSServiceContext
  ): Promise<ProcessIncomingSMSResult> {
    // Find or create contact by phone
    let contact = await this.db.contacts.findByPhone(payload.from, context.tenant_id)

    if (!contact) {
      // Create new contact from incoming SMS
      contact = await this.db.contacts.create({
        tenant_id: context.tenant_id,
        name: payload.from, // Use phone as name initially
        phone: payload.from,
        source: 'sms_inbound',
        current_pipeline: 'new_lead',
        current_stage: 'inquiry'
      })
    }

    // Create SMS message record
    const sms = await this.db.smsMessages.create({
      contact_id: contact.id,
      direction: 'inbound',
      message: payload.message,
      status: 'received',
      clicksend_message_id: payload.clicksend_message_id,
      received_at: payload.received_at
    })

    // Detect intent with AI
    const { result: intent, usage } = await this.ai.detectSMSIntent(payload.message, {
      contact_name: contact.name,
      contact_pipeline: contact.current_pipeline,
      contact_stage: contact.current_stage,
      recent_bookings: [] // TODO: Get recent bookings
    })

    // Update SMS with detected intent
    await this.db.smsMessages.update(sms.id, {
      intent: intent.intent,
      intent_confidence: intent.confidence
    })

    // Log AI usage
    await this.db.aiUsageLog.create({
      tenant_id: context.tenant_id,
      model: usage.model,
      use_case: 'sms_intent_detection',
      tokens_used: usage.tokens_used,
      cost_usd: usage.cost_usd,
      input_size: payload.message.length,
      output_size: JSON.stringify(intent).length,
      duration_ms: usage.duration_ms,
      metadata: JSON.stringify({ intent: intent.intent, confidence: intent.confidence })
    })

    // Create touchpoint
    await this.db.touchpoints.create({
      contact_id: contact.id,
      touchpoint_type: 'sms_received',
      channel: 'sms',
      direction: 'inbound',
      summary: payload.message.substring(0, 100),
      data: {
        sms_id: sms.id,
        intent: intent.intent,
        confidence: intent.confidence
      }
    })

    // Take action based on intent
    let actionTaken: string | undefined

    if (intent.intent === 'confirm' || intent.intent === 'reschedule' || intent.intent === 'cancel') {
      // Create task for staff to handle
      await this.db.tasks.create({
        tenant_id: context.tenant_id,
        contact_id: contact.id,
        title: `SMS ${intent.intent}: ${contact.name}`,
        description: `Message: ${payload.message}\n\nDetected intent: ${intent.intent} (${Math.round(intent.confidence * 100)}% confidence)\n\nAction needed: ${intent.suggested_action}`,
        task_type: 'sms_response',
        priority: intent.intent === 'cancel' ? 'high' : 'medium',
        status: 'pending',
        due_date: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
      })

      actionTaken = `created_task_${intent.intent}`
    }

    // Emit automation event
    await this.queue.send('automation', {
      type: 'sms_received',
      contact_id: contact.id,
      sms_id: sms.id,
      tenant_id: context.tenant_id,
      intent: intent.intent,
      message: payload.message
    })

    return {
      contact,
      sms_message: sms,
      intent_detected: intent.intent,
      action_taken: actionTaken,
      ai_cost_usd: usage.cost_usd
    }
  }

  /**
   * Send SMS via ClickSend (called by queue worker)
   */
  async sendViaClickSend(
    smsId: string,
    clicksendApiKey: string
  ): Promise<{ success: boolean; message_id?: string; cost_usd?: number }> {
    const sms = await this.db.smsMessages.get(smsId)
    if (!sms) {
      throw new Error(`SMS not found: ${smsId}`)
    }

    const contact = await this.db.contacts.get(sms.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${sms.contact_id}`)
    }

    try {
      // ClickSend API call
      const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(clicksendApiKey)}`
        },
        body: JSON.stringify({
          messages: [
            {
              to: contact.phone,
              body: sms.message,
              source: 'avatar-crm'
            }
          ]
        })
      })

      const result = await response.json()

      if (result.response_code === 'SUCCESS') {
        const messageId = result.data.messages[0]?.message_id
        const cost = result.data.messages[0]?.cost || 0

        // Update SMS status
        await this.db.smsMessages.update(smsId, {
          status: 'sent',
          clicksend_message_id: messageId,
          sent_at: Date.now()
        })

        return {
          success: true,
          message_id: messageId,
          cost_usd: parseFloat(cost)
        }
      } else {
        // Failed to send
        await this.db.smsMessages.update(smsId, {
          status: 'failed',
          error_message: result.response_msg || 'Unknown error'
        })

        return { success: false }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.db.smsMessages.update(smsId, {
        status: 'failed',
        error_message: errorMessage
      })

      return { success: false }
    }
  }

  /**
   * Get SMS message
   */
  async get(id: string): Promise<SMSMessage | null> {
    return this.db.smsMessages.get(id)
  }

  /**
   * List SMS messages for contact
   */
  async listByContact(contactId: string): Promise<SMSMessage[]> {
    return this.db.smsMessages.listByContact(contactId)
  }

  /**
   * Create SMS template
   */
  async createTemplate(
    data: CreateSMSTemplateInput,
    context: SMSServiceContext
  ): Promise<SMSTemplate> {
    return this.db.smsTemplates.create(data)
  }

  /**
   * Get SMS template
   */
  async getTemplate(id: string): Promise<SMSTemplate | null> {
    return this.db.smsTemplates.get(id)
  }

  /**
   * List SMS templates
   */
  async listTemplates(category?: string): Promise<SMSTemplate[]> {
    if (category) {
      return this.db.smsTemplates.findByCategory(category)
    }
    return this.db.smsTemplates.list()
  }

  /**
   * Delete SMS template
   */
  async deleteTemplate(id: string): Promise<void> {
    return this.db.smsTemplates.delete(id)
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, contact: Contact): string {
    let result = template

    result = result.replace(/\{\{name\}\}/g, contact.name || '')
    result = result.replace(/\{\{first_name\}\}/g, contact.name?.split(' ')[0] || '')
    result = result.replace(/\{\{phone\}\}/g, contact.phone)

    return result
  }

  /**
   * Get SMS analytics
   */
  async getAnalytics(
    tenantId: string,
    startDate: number,
    endDate: number
  ): Promise<{
    total_sent: number
    total_received: number
    total_failed: number
    delivery_rate: number
    response_rate: number
    intents_detected: Record<string, number>
  }> {
    // Get all contacts for tenant
    const contacts = await this.db.contacts.list({ tenant_id: tenantId, limit: 10000 })

    let totalSent = 0
    let totalReceived = 0
    let totalFailed = 0
    const intentsDetected: Record<string, number> = {}

    // Aggregate SMS data (simplified - in production use dedicated query)
    for (const contact of contacts.data.slice(0, 100)) {
      const messages = await this.db.smsMessages.listByContact(contact.id)

      for (const msg of messages) {
        if (!msg.created_at || msg.created_at < startDate || msg.created_at > endDate) {
          continue
        }

        if (msg.direction === 'outbound') {
          totalSent++
          if (msg.status === 'failed') totalFailed++
        } else if (msg.direction === 'inbound') {
          totalReceived++
          if (msg.intent) {
            intentsDetected[msg.intent] = (intentsDetected[msg.intent] || 0) + 1
          }
        }
      }
    }

    const deliveryRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0
    const responseRate = totalSent > 0 ? (totalReceived / totalSent) * 100 : 0

    return {
      total_sent: totalSent,
      total_received: totalReceived,
      total_failed: totalFailed,
      delivery_rate: Math.round(deliveryRate * 100) / 100,
      response_rate: Math.round(responseRate * 100) / 100,
      intents_detected: intentsDetected
    }
  }

  /**
   * Send bulk SMS to contacts
   */
  async sendBulk(
    contactIds: string[],
    message: string,
    context: SMSServiceContext
  ): Promise<{ queued: number; failed: number }> {
    let queued = 0
    let failed = 0

    for (const contactId of contactIds) {
      try {
        await this.send({ contact_id: contactId, message }, context)
        queued++
      } catch (error) {
        console.error(`Failed to queue SMS for ${contactId}:`, error)
        failed++
      }
    }

    return { queued, failed }
  }
}
