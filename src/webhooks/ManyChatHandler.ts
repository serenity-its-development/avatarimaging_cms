/**
 * ManyChatHandler - Webhook handler for Instagram/Facebook events
 * Receives webhooks from ManyChat and processes them
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from '../services/ContactService'
import { ManyChatService, type ManyChatSubscriber } from '../services/ManyChatService'

export interface ManyChatWebhookEvent {
  event: string
  subscriber?: ManyChatSubscriber
  subscriber_id?: string
  tag?: {
    id: string
    name: string
  }
  field?: {
    name: string
    value: any
  }
  message?: {
    text: string
    timestamp: string
  }
}

export class ManyChatHandler {
  private manyChatService: ManyChatService

  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway,
    private env: any
  ) {
    this.manyChatService = new ManyChatService(db, ai, queue, env)
  }

  /**
   * Handle incoming webhook from ManyChat
   */
  async handle(request: Request): Promise<Response> {
    try {
      // Get webhook signature
      const signature = request.headers.get('X-ManyChat-Signature') || ''

      // Parse payload
      const event = await request.json() as ManyChatWebhookEvent

      // Verify signature
      const body = JSON.stringify(event)
      if (!this.manyChatService.verifyWebhookSignature(body, signature)) {
        console.error('Invalid ManyChat webhook signature')
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid signature'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log('ManyChat webhook received:', event.event)

      // Route to appropriate handler
      let result

      switch (event.event) {
        case 'new_subscriber':
          result = await this.handleNewSubscriber(event)
          break

        case 'user_message':
          result = await this.handleUserMessage(event)
          break

        case 'tag_added':
          result = await this.handleTagAdded(event)
          break

        case 'tag_removed':
          result = await this.handleTagRemoved(event)
          break

        case 'custom_field_updated':
          result = await this.handleCustomFieldUpdated(event)
          break

        default:
          console.log(`Unhandled ManyChat event: ${event.event}`)
          result = { success: true, message: 'Event received but not processed' }
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('ManyChat webhook error:', error)
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
   * Handle new subscriber event
   */
  private async handleNewSubscriber(event: ManyChatWebhookEvent) {
    if (!event.subscriber) {
      throw new Error('Subscriber data missing')
    }

    console.log('New ManyChat subscriber:', event.subscriber.name)

    // Create or update contact
    const contact = await this.manyChatService.syncSubscriberToContact(event.subscriber)

    // Tag as new lead
    await this.manyChatService.addTag(event.subscriber.id, 'lead')

    // Calculate AI warmness score
    // (Queue this to avoid blocking webhook response)
    await this.queue.send('calculate_warmness', {
      contact_id: contact.id
    })

    // Log event
    await this.db.eventLogs.create({
      tenant_id: contact.tenant_id,
      event_type: 'instagram_new_subscriber',
      resource_type: 'contact',
      resource_id: contact.id,
      user_id: 'system',
      metadata: JSON.stringify({
        subscriber_id: event.subscriber.id,
        source: event.subscriber.source
      })
    })

    return {
      success: true,
      contact_id: contact.id,
      subscriber_id: event.subscriber.id
    }
  }

  /**
   * Handle user message event
   */
  private async handleUserMessage(event: ManyChatWebhookEvent) {
    if (!event.subscriber_id || !event.message) {
      throw new Error('Message data missing')
    }

    console.log('Message from subscriber:', event.subscriber_id)

    // Process message with AI intent detection
    const result = await this.manyChatService.processIncomingMessage(
      event.subscriber_id,
      event.message.text
    )

    return {
      success: true,
      contact_id: result.contact.id,
      intent: result.intent,
      action_taken: result.action_taken,
      ai_cost_usd: result.ai_cost_usd
    }
  }

  /**
   * Handle tag added event
   */
  private async handleTagAdded(event: ManyChatWebhookEvent) {
    if (!event.subscriber_id || !event.tag) {
      throw new Error('Tag data missing')
    }

    console.log(`Tag added: ${event.tag.name} for subscriber ${event.subscriber_id}`)

    // Find contact
    const contact = await this.db.contacts.findByManyChatId(event.subscriber_id)

    if (!contact) {
      // Subscriber not yet in CRM, fetch and create
      const subscriber = await this.manyChatService.getSubscriber(event.subscriber_id)
      if (subscriber) {
        await this.manyChatService.syncSubscriberToContact(subscriber)
      }
      return { success: true, message: 'Contact created' }
    }

    // Update contact tags
    const existingTags = contact.manychat_tags ? JSON.parse(contact.manychat_tags) : []
    if (!existingTags.includes(event.tag.name)) {
      existingTags.push(event.tag.name)
      await this.db.contacts.update(contact.id, {
        manychat_tags: JSON.stringify(existingTags)
      })
    }

    // Handle specific tags with actions
    switch (event.tag.name.toLowerCase()) {
      case 'booked':
      case 'appointment_booked':
        // Update pipeline stage
        await this.db.contacts.update(contact.id, {
          current_stage: 'booked'
        })
        break

      case 'qualified':
        // Move to qualified stage
        await this.db.contacts.update(contact.id, {
          current_stage: 'qualified'
        })
        break

      case 'interested-mri':
      case 'interested-ct':
      case 'interested-xray':
        // Create task for sales follow-up
        await this.db.tasks.create({
          contact_id: contact.id,
          tenant_id: contact.tenant_id,
          type: 'sales_follow_up',
          title: `Instagram lead interested in ${event.tag.name.replace('interested-', '')}`,
          description: `Contact tagged as ${event.tag.name} in ManyChat`,
          urgent: true,
          status: 'pending',
          created_by: 'system'
        })
        break
    }

    return {
      success: true,
      contact_id: contact.id,
      tag_added: event.tag.name
    }
  }

  /**
   * Handle tag removed event
   */
  private async handleTagRemoved(event: ManyChatWebhookEvent) {
    if (!event.subscriber_id || !event.tag) {
      throw new Error('Tag data missing')
    }

    console.log(`Tag removed: ${event.tag.name} for subscriber ${event.subscriber_id}`)

    // Find contact and update tags
    const contact = await this.db.contacts.findByManyChatId(event.subscriber_id)

    if (contact && contact.manychat_tags) {
      const existingTags = JSON.parse(contact.manychat_tags)
      const updatedTags = existingTags.filter((t: string) => t !== event.tag.name)

      await this.db.contacts.update(contact.id, {
        manychat_tags: JSON.stringify(updatedTags)
      })
    }

    return {
      success: true,
      contact_id: contact?.id,
      tag_removed: event.tag.name
    }
  }

  /**
   * Handle custom field updated event
   */
  private async handleCustomFieldUpdated(event: ManyChatWebhookEvent) {
    if (!event.subscriber_id || !event.field) {
      throw new Error('Field data missing')
    }

    console.log(`Custom field updated: ${event.field.name} = ${event.field.value}`)

    // Find or create contact
    let contact = await this.db.contacts.findByManyChatId(event.subscriber_id)

    if (!contact) {
      const subscriber = await this.manyChatService.getSubscriber(event.subscriber_id)
      if (subscriber) {
        contact = await this.manyChatService.syncSubscriberToContact(subscriber)
      } else {
        throw new Error('Subscriber not found')
      }
    }

    // Handle specific custom fields
    const updates: any = {}

    switch (event.field.name.toLowerCase()) {
      case 'appointment_date':
        // Create or update booking
        updates.next_appointment_date = new Date(event.field.value).getTime()
        break

      case 'preferred_location':
        // Update contact location preference
        updates.preferred_location = event.field.value
        break

      case 'scan_type':
        // Update contact data
        const data = contact.data ? JSON.parse(contact.data) : {}
        data.scan_type = event.field.value
        updates.data = JSON.stringify(data)
        break

      case 'phone':
      case 'phone_number':
        // Update phone
        updates.phone = event.field.value
        break

      case 'email':
        // Update email
        updates.email = event.field.value
        break
    }

    if (Object.keys(updates).length > 0) {
      await this.db.contacts.update(contact.id, updates)
    }

    return {
      success: true,
      contact_id: contact.id,
      field_updated: event.field.name,
      value: event.field.value
    }
  }
}
