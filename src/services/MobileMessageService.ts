/**
 * MobileMessageService - Australian SMS provider integration
 * Cost-effective SMS for Australian market (~$0.04-0.06 per SMS)
 * API: https://mobilemessage.com.au/api-docs
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type {
  SMSMessage,
  Contact,
  CreateSMSMessageInput
} from '../types/entities'

export interface MobileMessageEnv {
  MOBILEMESSAGE_API_KEY: string
  MOBILEMESSAGE_FROM_NUMBER: string
  MOBILEMESSAGE_WEBHOOK_SECRET?: string
}

export interface SendSMSRequest {
  contact_id: string
  message: string
  scheduled_for?: number
}

export interface SendSMSResult {
  sms_id: string
  sent: boolean
  provider_message_id?: string
  cost_aud?: number
}

export interface IncomingSMSPayload {
  from: string
  to: string
  message: string
  timestamp: string
  message_id?: string
}

export interface ProcessIncomingSMSResult {
  contact: Contact
  sms_message: SMSMessage
  intent_detected: string
  action_taken?: string
  ai_cost_usd: number
}

export class MobileMessageService {
  private apiKey: string
  private fromNumber: string
  private baseUrl = 'https://api.mobilemessage.com.au/v1'

  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway,
    private env: MobileMessageEnv
  ) {
    this.apiKey = env.MOBILEMESSAGE_API_KEY
    this.fromNumber = env.MOBILEMESSAGE_FROM_NUMBER
  }

  /**
   * Send SMS via MobileMessage API
   */
  async send(request: SendSMSRequest): Promise<SendSMSResult> {
    const contact = await this.db.contacts.get(request.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${request.contact_id}`)
    }

    if (!contact.phone) {
      throw new Error(`Contact ${request.contact_id} has no phone number`)
    }

    // Create SMS record
    const sms = await this.db.smsMessages.create({
      contact_id: request.contact_id,
      direction: 'outbound',
      message: request.message,
      status: request.scheduled_for ? 'scheduled' : 'pending',
      scheduled_for: request.scheduled_for,
      provider: 'mobilemessage'
    })

    // If scheduled, queue for later
    if (request.scheduled_for) {
      await this.queue.send('sms_scheduled', {
        sms_id: sms.id,
        send_at: request.scheduled_for
      })

      return {
        sms_id: sms.id,
        sent: false
      }
    }

    // Send immediately
    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: this.formatPhoneNumber(contact.phone),
          from: this.fromNumber,
          message: request.message
        })
      })

      const result = await response.json() as any

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      // Update SMS record with success
      await this.db.smsMessages.update(sms.id, {
        status: 'sent',
        provider_message_id: result.message_id,
        sent_at: Date.now(),
        cost_aud: result.cost || 0.045
      })

      // Log touchpoint
      await this.db.touchpoints.create({
        contact_id: request.contact_id,
        channel: 'sms',
        type: 'sms_sent',
        direction: 'outbound',
        notes: request.message.substring(0, 200)
      })

      return {
        sms_id: sms.id,
        sent: true,
        provider_message_id: result.message_id,
        cost_aud: result.cost
      }
    } catch (error) {
      // Update SMS record with failure
      await this.db.smsMessages.update(sms.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  /**
   * Process incoming SMS webhook from MobileMessage
   */
  async processIncoming(payload: IncomingSMSPayload): Promise<ProcessIncomingSMSResult> {
    // Find or create contact by phone number
    let contact = await this.db.contacts.findByPhone(payload.from)

    if (!contact) {
      // Create new contact from incoming SMS
      contact = await this.db.contacts.create({
        phone: payload.from,
        source: 'sms_inbound',
        current_pipeline: 'sms_leads',
        current_stage: 'new',
        tenant_id: 'default'
      })
    }

    // Create SMS message record
    const sms = await this.db.smsMessages.create({
      contact_id: contact.id,
      direction: 'inbound',
      message: payload.message,
      status: 'received',
      received_at: new Date(payload.timestamp).getTime(),
      provider_message_id: payload.message_id,
      provider: 'mobilemessage'
    })

    // Log touchpoint
    await this.db.touchpoints.create({
      contact_id: contact.id,
      channel: 'sms',
      type: 'sms_received',
      direction: 'inbound',
      notes: payload.message
    })

    // AI Booking Assistant - Check for booking-related intents
    const { AIBookingAssistant } = await import('./AIBookingAssistant')
    const bookingAssistant = new AIBookingAssistant(this.db, this.ai)

    let bookingAction: string | undefined
    try {
      const bookingResult = await bookingAssistant.processMessage({
        contact_id: contact.id,
        message: payload.message,
        channel: 'sms',
        tenant_id: contact.tenant_id,
      })

      if (bookingResult.draft) {
        bookingAction = `AI ${bookingResult.draft.action_type} draft created`
      } else if (bookingResult.auto_applied) {
        bookingAction = 'AI auto-cancelled booking'
      }
    } catch (error) {
      console.error('AI Booking Assistant error:', error)
    }

    // AI intent detection
    const intentResult = await this.ai.detectIntent(payload.message, {
      contact_name: contact.name,
      contact_history: await this.getContactHistory(contact.id)
    })

    const intent = intentResult.intent
    const aiCost = intentResult.cost_usd || 0.0001

    // Log AI usage
    await this.db.aiUsageLogs.create({
      tenant_id: contact.tenant_id,
      operation: 'sms_intent_detection',
      model: intentResult.model || 'llama-3.2-1b',
      input_tokens: intentResult.input_tokens || 0,
      output_tokens: intentResult.output_tokens || 0,
      cost_usd: aiCost,
      context: {
        contact_id: contact.id,
        sms_id: sms.id,
        message: payload.message,
        intent_detected: intent,
        booking_action: bookingAction
      }
    })

    // Take action based on intent (only if not already handled by booking assistant)
    let actionTaken = bookingAction
    if (!actionTaken) {
      actionTaken = await this.handleIntent(contact, intent, payload.message)
    }

    return {
      contact,
      sms_message: sms,
      intent_detected: intent,
      action_taken: actionTaken,
      ai_cost_usd: aiCost
    }
  }

  /**
   * Handle detected intent and take appropriate action
   */
  private async handleIntent(
    contact: Contact,
    intent: string,
    message: string
  ): Promise<string | undefined> {
    switch (intent.toLowerCase()) {
      case 'booking_confirmation':
      case 'confirm':
        // Find pending booking and confirm it
        const bookings = await this.db.bookings.list({
          tenant_id: contact.tenant_id,
          contact_id: contact.id,
          status: 'pending'
        })

        if (bookings.data && bookings.data.length > 0) {
          const booking = bookings.data[0]
          await this.db.bookings.update(booking.id, {
            status: 'confirmed',
            confirmed_at: Date.now()
          })

          // Send confirmation SMS
          await this.send({
            contact_id: contact.id,
            message: `✓ Your appointment is confirmed! We'll see you soon.`
          })

          return 'booking_confirmed'
        }
        break

      case 'booking_cancellation':
      case 'cancel':
        // Create task for staff to handle cancellation
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'cancellation_request',
          title: 'SMS: Customer wants to cancel',
          description: `Message: "${message}"`,
          urgent: true,
          status: 'pending',
          created_by: 'system'
        })

        // Auto-reply
        await this.send({
          contact_id: contact.id,
          message: `We've received your cancellation request. Our team will contact you shortly to assist.`
        })

        return 'cancellation_task_created'

      case 'booking_inquiry':
      case 'inquiry':
        // Create task for staff follow-up
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'follow_up',
          title: 'SMS: Booking inquiry',
          description: `Message: "${message}"`,
          urgent: false,
          status: 'pending',
          created_by: 'system'
        })

        // Auto-reply with info
        await this.send({
          contact_id: contact.id,
          message: `Thanks for your interest! Our team will get back to you within 30 minutes to help with your booking.`
        })

        return 'inquiry_task_created'

      case 'question':
      case 'help':
        // Create task for staff to answer
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'customer_question',
          title: 'SMS: Customer question',
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
          title: 'SMS: Requires response',
          description: `Message: "${message}"\nDetected intent: ${intent}`,
          urgent: false,
          status: 'pending',
          created_by: 'system'
        })

        return 'generic_task_created'
    }

    return undefined
  }

  /**
   * Get contact interaction history for AI context
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
   * Format phone number for MobileMessage API
   * Ensures Australian format: +61XXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, parentheses
    let clean = phone.replace(/[\s\-\(\)]/g, '')

    // If starts with 0, replace with +61
    if (clean.startsWith('0')) {
      clean = '+61' + clean.substring(1)
    }

    // If starts with 61, add +
    if (clean.startsWith('61')) {
      clean = '+' + clean
    }

    // If doesn't start with +, assume Australian and add +61
    if (!clean.startsWith('+')) {
      clean = '+61' + clean
    }

    return clean
  }

  /**
   * Verify webhook signature from MobileMessage
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.env.MOBILEMESSAGE_WEBHOOK_SECRET) {
      console.warn('MOBILEMESSAGE_WEBHOOK_SECRET not set, skipping verification')
      return true
    }

    // MobileMessage uses HMAC-SHA256
    // Implementation depends on their specific signature method
    // TODO: Implement actual signature verification based on MobileMessage docs

    return true
  }

  /**
   * Send bulk SMS (for campaigns)
   */
  async sendBulk(contactIds: string[], message: string): Promise<{
    sent: number
    failed: number
    total_cost_aud: number
  }> {
    let sent = 0
    let failed = 0
    let totalCost = 0

    for (const contactId of contactIds) {
      try {
        const result = await this.send({ contact_id: contactId, message })
        if (result.sent) {
          sent++
          totalCost += result.cost_aud || 0.045
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to send SMS to contact ${contactId}:`, error)
        failed++
      }
    }

    return {
      sent,
      failed,
      total_cost_aud: totalCost
    }
  }
}
