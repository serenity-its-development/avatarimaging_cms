/**
 * MobileMessageHandler - Webhook handler for incoming SMS
 * Receives SMS from MobileMessage API and processes them
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from '../services/ContactService'
import { MobileMessageService, type IncomingSMSPayload } from '../services/MobileMessageService'

export interface MobileMessageWebhookPayload {
  from: string
  to: string
  message: string
  timestamp: string
  message_id?: string
  type?: string
}

export class MobileMessageHandler {
  private mobileMessageService: MobileMessageService

  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway,
    private env: any
  ) {
    this.mobileMessageService = new MobileMessageService(db, ai, queue, env)
  }

  /**
   * Handle incoming SMS webhook from MobileMessage
   */
  async handleIncoming(request: Request): Promise<Response> {
    try {
      // Get webhook signature for verification
      const signature = request.headers.get('X-MobileMessage-Signature') || ''

      // Parse webhook payload
      const payload = await request.json() as MobileMessageWebhookPayload

      // Verify signature
      const body = JSON.stringify(payload)
      if (!this.mobileMessageService.verifyWebhookSignature(body, signature)) {
        console.error('Invalid webhook signature')
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid signature'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Log webhook received
      console.log('MobileMessage webhook received:', {
        from: payload.from,
        message: payload.message.substring(0, 50),
        timestamp: payload.timestamp
      })

      // Process incoming SMS
      const result = await this.mobileMessageService.processIncoming({
        from: payload.from,
        to: payload.to,
        message: payload.message,
        timestamp: payload.timestamp,
        message_id: payload.message_id
      })

      // Return success response
      return new Response(JSON.stringify({
        success: true,
        contact_id: result.contact.id,
        sms_id: result.sms_message.id,
        intent_detected: result.intent_detected,
        action_taken: result.action_taken
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('MobileMessage webhook error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  /**
   * Handle delivery receipt webhook from MobileMessage
   */
  async handleDeliveryReceipt(request: Request): Promise<Response> {
    try {
      const payload = await request.json() as any

      console.log('Delivery receipt received:', payload)

      // Find SMS message by provider_message_id
      const sms = await this.db.smsMessages.findByProviderMessageId(payload.message_id)

      if (sms) {
        // Update delivery status
        await this.db.smsMessages.update(sms.id, {
          status: payload.status === 'delivered' ? 'delivered' : 'failed',
          delivered_at: payload.status === 'delivered' ? Date.now() : undefined,
          error_message: payload.error
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message_id: payload.message_id,
        status: payload.status
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Delivery receipt error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}
