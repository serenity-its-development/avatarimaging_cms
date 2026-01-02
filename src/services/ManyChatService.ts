/**
 * ManyChatService - Instagram/Facebook Messenger automation
 * Integrates with ManyChat API for subscriber management and messaging
 * API: https://api.manychat.com/swagger
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type { Contact, CreateTouchpointInput } from '../types/entities'

export interface ManyChatEnv {
  MANYCHAT_API_KEY: string
  MANYCHAT_PAGE_ID: string
  MANYCHAT_WEBHOOK_SECRET?: string
}

export interface ManyChatSubscriber {
  id: string
  name: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  tags?: string[]
  custom_fields?: Record<string, any>
  subscribed_at?: string
  source?: string
}

export interface SendMessageRequest {
  subscriber_id: string
  message: string
  tag_name?: string
}

export interface SendFlowRequest {
  subscriber_id: string
  flow_ns: string
}

export class ManyChatService {
  private apiKey: string
  private pageId: string
  private baseUrl = 'https://api.manychat.com/fb'

  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway,
    private env: ManyChatEnv
  ) {
    this.apiKey = env.MANYCHAT_API_KEY
    this.pageId = env.MANYCHAT_PAGE_ID
  }

  /**
   * Send text message to subscriber
   */
  async sendMessage(request: SendMessageRequest): Promise<{ success: boolean; message_id?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriber/sendContent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriber_id: request.subscriber_id,
          messages: [
            {
              type: 'text',
              text: request.message
            }
          ],
          tag: request.tag_name
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      return {
        success: true,
        message_id: result.message_id
      }
    } catch (error) {
      console.error('ManyChat sendMessage error:', error)
      throw error
    }
  }

  /**
   * Send flow to subscriber
   */
  async sendFlow(request: SendFlowRequest): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriber/sendFlow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriber_id: request.subscriber_id,
          flow_ns: request.flow_ns
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('ManyChat sendFlow error:', error)
      throw error
    }
  }

  /**
   * Get subscriber information
   */
  async getSubscriber(subscriberId: string): Promise<ManyChatSubscriber | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/subscriber/getInfo?subscriber_id=${subscriberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json() as any
      return result.data as ManyChatSubscriber
    } catch (error) {
      console.error('ManyChat getSubscriber error:', error)
      return null
    }
  }

  /**
   * Add tag to subscriber
   */
  async addTag(subscriberId: string, tagName: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriber/addTag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_name: tagName
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('ManyChat addTag error:', error)
      throw error
    }
  }

  /**
   * Remove tag from subscriber
   */
  async removeTag(subscriberId: string, tagName: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriber/removeTag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          tag_name: tagName
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('ManyChat removeTag error:', error)
      throw error
    }
  }

  /**
   * Set custom field for subscriber
   */
  async setCustomField(
    subscriberId: string,
    fieldName: string,
    value: any
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriber/setCustomField`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          field_name: fieldName,
          field_value: value
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('ManyChat setCustomField error:', error)
      throw error
    }
  }

  /**
   * Sync subscriber to CRM contact
   * Creates or updates contact based on ManyChat subscriber data
   */
  async syncSubscriberToContact(subscriber: ManyChatSubscriber): Promise<Contact> {
    // Try to find existing contact by ManyChat subscriber ID
    const existingContact = await this.db.contacts.findByManyChatId(subscriber.id)

    if (existingContact) {
      // Update existing contact
      const updated = await this.db.contacts.update(existingContact.id, {
        name: subscriber.name || existingContact.name,
        email: subscriber.email || existingContact.email,
        phone: subscriber.phone || existingContact.phone,
        manychat_tags: JSON.stringify(subscriber.tags || [])
      })

      return updated
    }

    // Create new contact
    const newContact = await this.db.contacts.create({
      name: subscriber.name || `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim(),
      email: subscriber.email,
      phone: subscriber.phone,
      source: 'manychat_instagram',
      current_pipeline: 'instagram_leads',
      current_stage: 'new',
      tenant_id: 'default',
      manychat_subscriber_id: subscriber.id,
      manychat_tags: JSON.stringify(subscriber.tags || []),
      instagram_handle: subscriber.custom_fields?.instagram_handle
    })

    return newContact
  }

  /**
   * Handle incoming message with AI intent detection
   */
  async processIncomingMessage(
    subscriberId: string,
    message: string,
    context?: any
  ): Promise<{
    contact: Contact
    intent: string
    action_taken?: string
    ai_cost_usd: number
  }> {
    // Get or create contact
    const subscriber = await this.getSubscriber(subscriberId)
    if (!subscriber) {
      throw new Error(`Subscriber not found: ${subscriberId}`)
    }

    const contact = await this.syncSubscriberToContact(subscriber)

    // Log touchpoint
    await this.db.touchpoints.create({
      contact_id: contact.id,
      channel: 'instagram_dm',
      type: 'message_received',
      direction: 'inbound',
      notes: message,
      metadata: JSON.stringify({ subscriber_id: subscriberId })
    })

    // AI intent detection
    const intentResult = await this.ai.detectIntent(message, {
      contact_name: contact.name,
      contact_history: await this.getContactHistory(contact.id),
      platform: 'instagram'
    })

    const intent = intentResult.intent
    const aiCost = intentResult.cost_usd || 0.0001

    // Log AI usage
    await this.db.aiUsageLogs.create({
      tenant_id: contact.tenant_id,
      operation: 'instagram_intent_detection',
      model: intentResult.model || 'llama-3.2-1b',
      input_tokens: intentResult.input_tokens || 0,
      output_tokens: intentResult.output_tokens || 0,
      cost_usd: aiCost,
      context: {
        contact_id: contact.id,
        subscriber_id: subscriberId,
        message: message,
        intent_detected: intent
      }
    })

    // Handle intent and take action
    const actionTaken = await this.handleIntent(contact, subscriberId, intent, message)

    return {
      contact,
      intent,
      action_taken,
      ai_cost_usd: aiCost
    }
  }

  /**
   * Handle detected intent from Instagram message
   */
  private async handleIntent(
    contact: Contact,
    subscriberId: string,
    intent: string,
    message: string
  ): Promise<string | undefined> {
    switch (intent.toLowerCase()) {
      case 'booking_inquiry':
      case 'appointment_inquiry':
        // Tag subscriber
        await this.addTag(subscriberId, 'interested')

        // Send booking flow
        // await this.sendFlow({ subscriber_id: subscriberId, flow_ns: 'booking_flow' })

        // Create task for staff follow-up
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'follow_up',
          title: 'Instagram DM: Booking inquiry',
          description: `Message: "${message}"`,
          urgent: true,
          status: 'pending',
          created_by: 'system'
        })

        // Auto-respond
        await this.sendMessage({
          subscriber_id: subscriberId,
          message: "Thanks for your interest! 😊 We have appointments available this week. Our team will message you shortly with available times."
        })

        return 'booking_inquiry_handled'

      case 'pricing_inquiry':
        // Tag subscriber
        await this.addTag(subscriberId, 'pricing_inquiry')

        // Send pricing info (or trigger flow)
        await this.sendMessage({
          subscriber_id: subscriberId,
          message: "We offer competitive pricing for all our services. Our team will send you a detailed price list shortly. What service are you interested in?"
        })

        // Create task
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'send_pricing',
          title: 'Instagram DM: Send pricing',
          description: `Message: "${message}"`,
          urgent: false,
          status: 'pending',
          created_by: 'system'
        })

        return 'pricing_inquiry_handled'

      case 'location_inquiry':
        // Auto-respond with locations
        await this.sendMessage({
          subscriber_id: subscriberId,
          message: "📍 We have 3 convenient locations:\n\n1. Brisbane CBD\n2. Gold Coast\n3. Sunshine Coast\n\nWhich location is closest to you?"
        })

        return 'location_info_sent'

      case 'question':
      case 'help':
        // Create task for staff
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'customer_question',
          title: 'Instagram DM: Question',
          description: `Message: "${message}"`,
          urgent: false,
          status: 'pending',
          created_by: 'system'
        })

        return 'question_task_created'

      default:
        // Unknown intent - create generic task
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'follow_up',
          title: 'Instagram DM: Requires response',
          description: `Message: "${message}"\nIntent: ${intent}`,
          urgent: false,
          status: 'pending',
          created_by: 'system'
        })

        return 'generic_task_created'
    }
  }

  /**
   * Get contact interaction history
   */
  private async getContactHistory(contactId: string): Promise<string> {
    const touchpoints = await this.db.touchpoints.list({
      contact_id: contactId,
      limit: 5
    })

    if (!touchpoints.data || touchpoints.data.length === 0) {
      return 'No previous interactions'
    }

    return touchpoints.data
      .map(t => `${t.channel}: ${t.notes || t.type}`)
      .join('; ')
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.env.MANYCHAT_WEBHOOK_SECRET) {
      console.warn('MANYCHAT_WEBHOOK_SECRET not set, skipping verification')
      return true
    }

    // ManyChat uses HMAC-SHA256 or similar
    // TODO: Implement based on ManyChat webhook documentation

    return true
  }
}
