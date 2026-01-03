/**
 * Avatar Imaging CRM - Cloudflare Worker Entry Point
 * AI-First Architecture with Workers AI Integration
 */

import { D1DatabaseGateway } from './gateway/D1DatabaseGateway'
import { AILayer } from './ai/AILayer'
import { Router } from './router/Router'
import type { Env } from './types/env'

export default {
  /**
   * Main fetch handler - Routes all HTTP requests and serves frontend
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)

      // API/webhook routes - handle via Router
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/webhooks') || url.pathname === '/health') {
        const db = new D1DatabaseGateway(env.DB)
        const ai = new AILayer(env.AI)
        const router = new Router(db, ai, env, ctx)
        return await router.handle(request)
      }

      // Static assets - serve from Assets binding (Modern approach)
      return await env.ASSETS.fetch(request)
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  },

  /**
   * Queue handler - Processes async jobs (SMS, Email, Automation)
   */
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    const db = new D1DatabaseGateway(env.DB)
    const ai = new AILayer(env.AI)

    for (const message of batch.messages) {
      try {
        await processQueueMessage(message.body, db, ai, env)
        message.ack()
      } catch (error) {
        console.error('Queue processing error:', error)
        message.retry()
      }
    }
  },

  /**
   * Scheduled handler - Cron jobs (Reminders, Warmness calc, Reports)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = new D1DatabaseGateway(env.DB)
    const ai = new AILayer(env.AI)

    try {
      switch (event.cron) {
        case '0 */3 * * *': // Every 3 hours - Send booking reminders
          await sendBookingReminders(db, env)
          break

        case '0 2 * * *': // Daily at 2am - Recalculate warmness
          await recalculateWarmness(db, ai, env)
          break

        case '0 8 * * 1': // Weekly Monday 8am - Send scheduled reports
          await sendScheduledReports(db, ai, env)
          break

        case '*/15 * * * *': // Every 15 minutes - Process pending AI tasks
          await processPendingAITasks(db, ai, env)
          break
      }
    } catch (error) {
      console.error('Scheduled job error:', error)
    }
  }
}

/**
 * Process queue messages
 */
async function processQueueMessage(
  message: any,
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  const { type } = message

  switch (type) {
    case 'sms':
    case 'send':
      await processSMS(message, db, env)
      break

    case 'email':
      await processEmail(message, db, env)
      break

    case 'automation':
      await processAutomation(message, db, ai, env)
      break

    case 'wix_sync':
      await processWixSync(message, db, env)
      break

    case 'process_ai_task':
      await processAITask(message, db, ai, env)
      break

    default:
      console.warn('Unknown queue message type:', type)
  }
}

/**
 * SMS queue processor - Sends SMS via ClickSend
 */
async function processSMS(message: any, db: D1DatabaseGateway, env: Env): Promise<void> {
  const { sms_id, phone, message: text, type: smsType } = message

  if (!env.CLICKSEND_API_KEY) {
    console.error('CLICKSEND_API_KEY not configured')
    return
  }

  try {
    // Send via ClickSend API
    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(env.CLICKSEND_API_KEY)}`
      },
      body: JSON.stringify({
        messages: [{
          to: phone,
          body: text,
          source: 'avatar-crm'
        }]
      })
    })

    const result = await response.json()

    if (sms_id && result.response_code === 'SUCCESS') {
      const messageId = result.data.messages[0]?.message_id
      await db.smsMessages.update(sms_id, {
        status: 'sent',
        clicksend_message_id: messageId,
        sent_at: Date.now()
      })
    } else if (sms_id) {
      await db.smsMessages.update(sms_id, {
        status: 'failed',
        error_message: result.response_msg || 'Unknown error'
      })
    }
  } catch (error) {
    console.error('SMS send error:', error)
    if (sms_id) {
      await db.smsMessages.update(sms_id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

/**
 * Email queue processor
 */
async function processEmail(message: any, db: D1DatabaseGateway, env: Env): Promise<void> {
  // TODO: Implement email sending (SendGrid, Mailgun, etc.)
  console.log('Email processing not yet implemented:', message)
}

/**
 * Automation queue processor - Executes automation rules
 */
async function processAutomation(
  message: any,
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  const { AutomationService } = await import('./services/AutomationService')

  const queue = {
    send: async (queueName: string, msg: any) => {
      await env.QUEUE.send(msg)
    }
  }

  const automationService = new AutomationService(db, queue)
  await automationService.processEvent(message)
}

/**
 * Wix sync processor
 */
async function processWixSync(message: any, db: D1DatabaseGateway, env: Env): Promise<void> {
  // TODO: Implement Wix integration
  console.log('Wix sync not yet implemented:', message)
}

/**
 * Cron: Send booking reminders
 */
async function sendBookingReminders(db: D1DatabaseGateway, env: Env): Promise<void> {
  const { BookingService } = await import('./services/BookingService')

  const queue = {
    send: async (queueName: string, message: any) => {
      await env.QUEUE.send(message)
    }
  }

  const ai = new AILayer(env.AI)
  const bookingService = new BookingService(db, ai, queue)

  // Get all tenants (simplified - should query locations table)
  const tenants = ['default'] // TODO: Query actual tenants

  for (const tenantId of tenants) {
    const sent = await bookingService.sendReminders(tenantId, 24)
    console.log(`Sent ${sent} booking reminders for tenant ${tenantId}`)
  }
}

/**
 * Cron: Recalculate contact warmness
 */
async function recalculateWarmness(
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  const { ContactService } = await import('./services/ContactService')

  const queue = {
    send: async (queueName: string, message: any) => {
      await env.QUEUE.send(message)
    }
  }

  const contactService = new ContactService(db, ai, queue)

  // Get all tenants
  const tenants = ['default'] // TODO: Query actual tenants

  for (const tenantId of tenants) {
    const result = await contactService.bulkRecalculateWarmness(tenantId)
    console.log(`Recalculated warmness for ${result.processed} contacts (cost: $${result.total_cost_usd})`)
  }
}

/**
 * Cron: Send scheduled reports
 */
async function sendScheduledReports(
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  const { ReportingService } = await import('./services/ReportingService')

  const queue = {
    send: async (queueName: string, message: any) => {
      await env.QUEUE.send(message)
    }
  }

  const reportingService = new ReportingService(db, ai, queue)
  const processed = await reportingService.runScheduledReports()

  console.log(`Processed ${processed} scheduled reports`)
}

/**
 * AI Task processor - Executes tasks assigned to AI
 */
async function processAITask(
  message: any,
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  const { taskId } = message

  if (!taskId) {
    console.error('AI task message missing taskId')
    return
  }

  try {
    const { AITaskProcessor } = await import('./services/AITaskProcessor')
    const processor = new AITaskProcessor(db, ai)
    const result = await processor.processTask(taskId)

    console.log(`AI task ${taskId} processed:`, result.success ? 'success' : 'failed')
  } catch (error) {
    console.error(`Failed to process AI task ${taskId}:`, error)
    throw error
  }
}

/**
 * Process all pending AI tasks (scheduled job)
 */
async function processPendingAITasks(
  db: D1DatabaseGateway,
  ai: AILayer,
  env: Env
): Promise<void> {
  try {
    const { AITaskProcessor } = await import('./services/AITaskProcessor')
    const processor = new AITaskProcessor(db, ai)
    const stats = await processor.processPendingAITasks()

    console.log(`Processed ${stats.processed} AI tasks: ${stats.succeeded} succeeded, ${stats.failed} failed`)
  } catch (error) {
    console.error('Failed to process pending AI tasks:', error)
  }
}
