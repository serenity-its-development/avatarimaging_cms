/**
 * Router - API routing with middleware support
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { Env } from '../types/env'
import { ContactService } from '../services/ContactService'
import { BookingService } from '../services/BookingService'
import { SMSService } from '../services/SMSService'
import { EmailMarketingService } from '../services/EmailMarketingService'
import { ReportingService } from '../services/ReportingService'
import { AutomationService } from '../services/AutomationService'
import { PipelineService } from '../services/PipelineService'
import { TagService } from '../services/TagService'

export class Router {
  private services: {
    contacts: ContactService
    bookings: BookingService
    sms: SMSService
    emailMarketing: EmailMarketingService
    reporting: ReportingService
    automation: AutomationService
    pipelines: PipelineService
    tags: TagService
  }

  constructor(
    private db: D1DatabaseGateway,
    private ai: AILayer,
    private env: Env,
    private ctx: ExecutionContext
  ) {
    // Initialize all services with AI layer
    const queue = {
      send: async (queueName: string, message: any) => {
        await this.env.QUEUE.send(message)
      }
    }

    this.services = {
      contacts: new ContactService(db, ai, queue),
      bookings: new BookingService(db, ai, queue),
      sms: new SMSService(db, ai, queue),
      emailMarketing: new EmailMarketingService(db, ai, queue),
      reporting: new ReportingService(db, ai, queue),
      automation: new AutomationService(db, queue),
      pipelines: new PipelineService(db),
      tags: new TagService(db, ai)
    }
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // Health check
      if (path === '/health') {
        return this.jsonResponse({ status: 'ok', ai: 'enabled' })
      }

      // Contact routes
      if (path.startsWith('/api/contacts')) {
        return await this.handleContactRoutes(request, path, method, corsHeaders)
      }

      // Booking routes
      if (path.startsWith('/api/bookings')) {
        return await this.handleBookingRoutes(request, path, method, corsHeaders)
      }

      // SMS routes
      if (path.startsWith('/api/sms')) {
        return await this.handleSMSRoutes(request, path, method, corsHeaders)
      }

      // Task routes
      if (path.startsWith('/api/tasks')) {
        return await this.handleTaskRoutes(request, path, method, corsHeaders)
      }

      // Report routes
      if (path.startsWith('/api/reports')) {
        return await this.handleReportRoutes(request, path, method, corsHeaders)
      }

      // Pipeline routes
      if (path.startsWith('/api/pipelines')) {
        return await this.handlePipelineRoutes(request, path, method, corsHeaders)
      }

      // Tag routes
      if (path.startsWith('/api/tags')) {
        return await this.handleTagRoutes(request, path, method, corsHeaders)
      }

      // Webhook routes
      if (path.startsWith('/webhooks')) {
        return await this.handleWebhooks(request, path, method, corsHeaders)
      }

      return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
    } catch (error) {
      console.error('Route error:', error)
      return this.jsonResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      }, 500, corsHeaders)
    }
  }

  private async handleContactRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' } // TODO: Extract from auth

    // GET /api/contacts - List contacts
    if (path === '/api/contacts' && method === 'GET') {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const result = await this.db.contacts.list({
        tenant_id: context.tenant_id,
        limit,
        offset
      })

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // GET /api/contacts/:id - Get contact
    if (path.match(/^\/api\/contacts\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const contact = await this.db.contacts.get(id)

      if (!contact) {
        return this.jsonResponse({ error: 'Contact not found' }, 404, corsHeaders)
      }

      return this.jsonResponse(contact, 200, corsHeaders)
    }

    // POST /api/contacts - Create contact with AI
    if (path === '/api/contacts' && method === 'POST') {
      const data = await request.json()
      const result = await this.services.contacts.create({
        ...data,
        tenant_id: context.tenant_id
      }, context)

      return this.jsonResponse(result, 201, corsHeaders)
    }

    // PUT /api/contacts/:id - Update contact
    if (path.match(/^\/api\/contacts\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      const result = await this.services.contacts.update(id, data, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // DELETE /api/contacts/:id
    if (path.match(/^\/api\/contacts\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      await this.services.contacts.delete(id, context)

      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    // POST /api/contacts/:id/recalculate-warmness - AI warmness
    if (path.match(/^\/api\/contacts\/[^\/]+\/recalculate-warmness$/) && method === 'POST') {
      const id = path.split('/')[3]
      const result = await this.services.contacts.recalculateWarmness(id, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // GET /api/contacts/search?q=
    if (path === '/api/contacts/search' && method === 'GET') {
      const url = new URL(request.url)
      const query = url.searchParams.get('q') || ''
      const results = await this.services.contacts.search(query, context.tenant_id)

      return this.jsonResponse({ results }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleBookingRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // GET /api/bookings - List bookings
    if (path === '/api/bookings' && method === 'GET') {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const result = await this.db.bookings.list({
        tenant_id: context.tenant_id,
        limit
      })

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // POST /api/bookings - Create booking
    if (path === '/api/bookings' && method === 'POST') {
      const data = await request.json()
      const result = await this.services.bookings.create({
        ...data,
        tenant_id: context.tenant_id
      }, context)

      return this.jsonResponse(result, 201, corsHeaders)
    }

    // PUT /api/bookings/:id - Update booking
    if (path.match(/^\/api\/bookings\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      const result = await this.services.bookings.update(id, data, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // POST /api/bookings/:id/cancel - Cancel booking
    if (path.match(/^\/api\/bookings\/[^\/]+\/cancel$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      await this.services.bookings.cancel(id, data.reason, context)

      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    // POST /api/bookings/:id/complete - Complete booking
    if (path.match(/^\/api\/bookings\/[^\/]+\/complete$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      const result = await this.services.bookings.complete(id, data.notes, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // GET /api/bookings/availability?staff_id=&date=
    if (path === '/api/bookings/availability' && method === 'GET') {
      const url = new URL(request.url)
      const staffId = url.searchParams.get('staff_id')
      const date = parseInt(url.searchParams.get('date') || Date.now().toString())

      if (!staffId) {
        return this.jsonResponse({ error: 'staff_id required' }, 400, corsHeaders)
      }

      const slots = await this.services.bookings.getAvailability(staffId, date)
      return this.jsonResponse({ slots }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleSMSRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // POST /api/sms/send - Send SMS
    if (path === '/api/sms/send' && method === 'POST') {
      const data = await request.json()
      const result = await this.services.sms.send(data, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleTaskRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // GET /api/tasks - List tasks
    if (path === '/api/tasks' && method === 'GET') {
      const url = new URL(request.url)
      const urgent = url.searchParams.get('urgent') === 'true'
      const assignedTo = url.searchParams.get('assigned_to')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      const result = await this.db.tasks.list({
        tenant_id: context.tenant_id,
        urgent_only: urgent,
        assigned_to: assignedTo || undefined,
        limit
      })

      return this.jsonResponse(result, 200, corsHeaders)
    }

    // GET /api/tasks/:id - Get task
    if (path.match(/^\/api\/tasks\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const task = await this.db.tasks.get(id)

      if (!task) {
        return this.jsonResponse({ error: 'Task not found' }, 404, corsHeaders)
      }

      return this.jsonResponse(task, 200, corsHeaders)
    }

    // POST /api/tasks - Create task
    if (path === '/api/tasks' && method === 'POST') {
      const data = await request.json()
      const task = await this.db.tasks.create({
        ...data,
        tenant_id: context.tenant_id,
        created_by: context.user_id
      })

      return this.jsonResponse(task, 201, corsHeaders)
    }

    // PUT /api/tasks/:id - Update task
    if (path.match(/^\/api\/tasks\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      const updated = await this.db.tasks.update(id, data)

      return this.jsonResponse(updated, 200, corsHeaders)
    }

    // DELETE /api/tasks/:id - Delete task
    if (path.match(/^\/api\/tasks\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      await this.db.tasks.delete(id)

      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleReportRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // GET /api/reports/dashboard - Quick dashboard stats
    if (path === '/api/reports/dashboard' && method === 'GET') {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

      // Get basic counts
      const contactsResult = await this.db.contacts.list({ tenant_id: context.tenant_id, limit: 1000 })
      const bookingsResult = await this.db.bookings.list({ tenant_id: context.tenant_id, limit: 1000 })
      const tasksResult = await this.db.tasks.list({ tenant_id: context.tenant_id, limit: 1000 })

      const contacts = contactsResult.data || []
      const bookings = bookingsResult.data || []
      const tasks = tasksResult.data || []

      // Calculate stats
      const totalContacts = contacts.length
      const totalBookings = bookings.length
      const pendingTasks = tasks.filter(t => t.status === 'pending').length
      const urgentTasks = tasks.filter(t => t.urgent).length

      const completedBookings = bookings.filter(b => b.status === 'completed').length
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
      const noShowBookings = bookings.filter(b => b.status === 'no_show').length

      // Recent activity
      const recentContacts = contacts.filter(c => c.created_at >= thirtyDaysAgo).length
      const recentBookings = bookings.filter(b => b.created_at >= thirtyDaysAgo).length

      return this.jsonResponse({
        total_contacts: totalContacts,
        total_bookings: totalBookings,
        pending_tasks: pendingTasks,
        urgent_tasks: urgentTasks,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        no_show_bookings: noShowBookings,
        recent_contacts_30d: recentContacts,
        recent_bookings_30d: recentBookings,
        conversion_rate: totalContacts > 0 ? (completedBookings / totalContacts * 100).toFixed(1) : '0.0'
      }, 200, corsHeaders)
    }

    // GET /api/reports/contacts - Contacts report with AI insights
    if (path === '/api/reports/contacts' && method === 'GET') {
      const url = new URL(request.url)
      const startDate = parseInt(url.searchParams.get('start_date') || '0')
      const endDate = parseInt(url.searchParams.get('end_date') || Date.now().toString())

      const report = await this.services.reporting.generateContactsReport(
        context.tenant_id,
        { start_date: startDate, end_date: endDate, include_ai_insights: true },
        context
      )

      return this.jsonResponse(report, 200, corsHeaders)
    }

    // GET /api/reports/bookings - Bookings report with AI insights
    if (path === '/api/reports/bookings' && method === 'GET') {
      const url = new URL(request.url)
      const startDate = parseInt(url.searchParams.get('start_date') || '0')
      const endDate = parseInt(url.searchParams.get('end_date') || Date.now().toString())

      const report = await this.services.reporting.generateBookingsReport(
        context.tenant_id,
        { start_date: startDate, end_date: endDate, include_ai_insights: true },
        context
      )

      return this.jsonResponse(report, 200, corsHeaders)
    }

    // GET /api/reports/performance - Full performance report with AI
    if (path === '/api/reports/performance' && method === 'GET') {
      const url = new URL(request.url)
      const startDate = parseInt(url.searchParams.get('start_date') || '0')
      const endDate = parseInt(url.searchParams.get('end_date') || Date.now().toString())

      const report = await this.services.reporting.generatePerformanceReport(
        context.tenant_id,
        { start_date: startDate, end_date: endDate, include_ai_insights: true },
        context
      )

      return this.jsonResponse(report, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleWebhooks(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // MobileMessage SMS webhooks
    if (path === '/webhooks/mobilemessage/incoming' && method === 'POST') {
      const { MobileMessageHandler } = await import('../webhooks/MobileMessageHandler')
      const handler = new MobileMessageHandler(this.db, this.ai, {
        send: async (queueName: string, message: any) => {
          await this.env.QUEUE.send(message)
        }
      }, this.env)

      return await handler.handleIncoming(request)
    }

    if (path === '/webhooks/mobilemessage/delivery' && method === 'POST') {
      const { MobileMessageHandler } = await import('../webhooks/MobileMessageHandler')
      const handler = new MobileMessageHandler(this.db, this.ai, {
        send: async (queueName: string, message: any) => {
          await this.env.QUEUE.send(message)
        }
      }, this.env)

      return await handler.handleDeliveryReceipt(request)
    }

    // ManyChat Instagram/Facebook webhooks
    if (path === '/webhooks/manychat' && method === 'POST') {
      const { ManyChatHandler } = await import('../webhooks/ManyChatHandler')
      const handler = new ManyChatHandler(this.db, this.ai, {
        send: async (queueName: string, message: any) => {
          await this.env.QUEUE.send(message)
        }
      }, this.env)

      return await handler.handle(request)
    }

    // Legacy: ClickSend SMS webhook
    if (path === '/webhooks/sms/incoming' && method === 'POST') {
      const data = await request.json()

      const result = await this.services.sms.processIncoming({
        from: data.from,
        to: data.to,
        message: data.message,
        received_at: Date.now(),
        clicksend_message_id: data.message_id
      }, context)

      return this.jsonResponse(result, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handlePipelineRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // GET /api/pipelines - List all pipelines
    if (path === '/api/pipelines' && method === 'GET') {
      const url = new URL(request.url)
      const includeInactive = url.searchParams.get('include_inactive') === 'true'

      const pipelines = await this.services.pipelines.listAll(includeInactive)
      return this.jsonResponse({ success: true, data: pipelines }, 200, corsHeaders)
    }

    // GET /api/pipelines/default - Get default pipeline
    if (path === '/api/pipelines/default' && method === 'GET') {
      const pipeline = await this.services.pipelines.getDefault()
      if (!pipeline) {
        return this.jsonResponse({ error: 'No default pipeline found' }, 404, corsHeaders)
      }
      return this.jsonResponse({ success: true, data: pipeline }, 200, corsHeaders)
    }

    // GET /api/pipelines/:id - Get pipeline by ID
    if (path.match(/^\/api\/pipelines\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      if (id === 'default') {
        // Already handled above
        return this.jsonResponse({ error: 'Invalid route' }, 400, corsHeaders)
      }

      const pipeline = await this.services.pipelines.getById(id)
      if (!pipeline) {
        return this.jsonResponse({ error: 'Pipeline not found' }, 404, corsHeaders)
      }
      return this.jsonResponse({ success: true, data: pipeline }, 200, corsHeaders)
    }

    // POST /api/pipelines - Create new pipeline
    if (path === '/api/pipelines' && method === 'POST') {
      const data = await request.json()

      if (!data.name || !data.stages || !Array.isArray(data.stages)) {
        return this.jsonResponse({
          error: 'Missing required fields: name, stages (array)'
        }, 400, corsHeaders)
      }

      const pipeline = await this.services.pipelines.create(data)
      return this.jsonResponse({ success: true, data: pipeline }, 201, corsHeaders)
    }

    // PUT /api/pipelines/:id - Update pipeline
    if (path.match(/^\/api\/pipelines\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const pipeline = await this.services.pipelines.update(id, data)
      return this.jsonResponse({ success: true, data: pipeline }, 200, corsHeaders)
    }

    // DELETE /api/pipelines/:id - Delete pipeline (soft delete)
    if (path.match(/^\/api\/pipelines\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!

      await this.services.pipelines.delete(id)
      return this.jsonResponse({ success: true, message: 'Pipeline deleted' }, 200, corsHeaders)
    }

    // POST /api/pipelines/:id/stages - Create new stage
    if (path.match(/^\/api\/pipelines\/[^\/]+\/stages$/) && method === 'POST') {
      const pipelineId = path.split('/')[3]
      const data = await request.json()

      if (!data.name || !data.key) {
        return this.jsonResponse({
          error: 'Missing required fields: name, key'
        }, 400, corsHeaders)
      }

      const stage = await this.services.pipelines.createStage(pipelineId, data)
      return this.jsonResponse({ success: true, data: stage }, 201, corsHeaders)
    }

    // PUT /api/pipelines/:pipelineId/stages/:stageId - Update stage
    if (path.match(/^\/api\/pipelines\/[^\/]+\/stages\/[^\/]+$/) && method === 'PUT') {
      const stageId = path.split('/').pop()!
      const data = await request.json()

      const stage = await this.services.pipelines.updateStage(stageId, data)
      return this.jsonResponse({ success: true, data: stage }, 200, corsHeaders)
    }

    // DELETE /api/pipelines/:pipelineId/stages/:stageId - Delete stage
    if (path.match(/^\/api\/pipelines\/[^\/]+\/stages\/[^\/]+$/) && method === 'DELETE') {
      const stageId = path.split('/').pop()!

      await this.services.pipelines.deleteStage(stageId)
      return this.jsonResponse({ success: true, message: 'Stage deleted' }, 200, corsHeaders)
    }

    // POST /api/pipelines/:id/reorder - Reorder stages
    if (path.match(/^\/api\/pipelines\/[^\/]+\/reorder$/) && method === 'POST') {
      const pipelineId = path.split('/')[3]
      const data = await request.json()

      if (!Array.isArray(data.stages)) {
        return this.jsonResponse({
          error: 'Missing required field: stages (array of {stage_id, new_order})'
        }, 400, corsHeaders)
      }

      const stages = await this.services.pipelines.reorderStages(pipelineId, data.stages)
      return this.jsonResponse({ success: true, data: stages }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleTagRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // GET /api/tags - List all tags
    if (path === '/api/tags' && method === 'GET') {
      const url = new URL(request.url)
      const category = url.searchParams.get('category') || undefined
      const includeInactive = url.searchParams.get('include_inactive') === 'true'

      const tags = await this.services.tags.listAll(category, includeInactive)
      return this.jsonResponse({ success: true, data: tags }, 200, corsHeaders)
    }

    // GET /api/tags/:id - Get tag by ID
    if (path.match(/^\/api\/tags\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const tag = await this.services.tags.getById(id)

      if (!tag) {
        return this.jsonResponse({ error: 'Tag not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: tag }, 200, corsHeaders)
    }

    // POST /api/tags - Create new tag
    if (path === '/api/tags' && method === 'POST') {
      const data = await request.json()

      if (!data.name || !data.category) {
        return this.jsonResponse({
          error: 'Missing required fields: name, category'
        }, 400, corsHeaders)
      }

      const tag = await this.services.tags.create(data)
      return this.jsonResponse({ success: true, data: tag }, 201, corsHeaders)
    }

    // PUT /api/tags/:id - Update tag
    if (path.match(/^\/api\/tags\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const tag = await this.services.tags.update(id, data)
      return this.jsonResponse({ success: true, data: tag }, 200, corsHeaders)
    }

    // DELETE /api/tags/:id - Delete tag
    if (path.match(/^\/api\/tags\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      await this.services.tags.delete(id)
      return this.jsonResponse({ success: true, message: 'Tag deleted' }, 200, corsHeaders)
    }

    // GET /api/tags/contact/:contactId - Get tags for contact
    if (path.match(/^\/api\/tags\/contact\/[^\/]+$/) && method === 'GET') {
      const contactId = path.split('/').pop()!
      const tags = await this.services.tags.getContactTags(contactId)
      return this.jsonResponse({ success: true, data: tags }, 200, corsHeaders)
    }

    // POST /api/tags/contact/:contactId - Add tag to contact
    if (path.match(/^\/api\/tags\/contact\/[^\/]+$/) && method === 'POST') {
      const contactId = path.split('/').pop()!
      const data = await request.json()

      if (!data.tag_id) {
        return this.jsonResponse({
          error: 'Missing required field: tag_id'
        }, 400, corsHeaders)
      }

      await this.services.tags.addTagToContact(
        contactId,
        data.tag_id,
        data.added_by || 'staff',
        data.confidence
      )

      return this.jsonResponse({ success: true, message: 'Tag added to contact' }, 200, corsHeaders)
    }

    // DELETE /api/tags/contact/:contactId/:tagId - Remove tag from contact
    if (path.match(/^\/api\/tags\/contact\/[^\/]+\/[^\/]+$/) && method === 'DELETE') {
      const parts = path.split('/')
      const tagId = parts.pop()!
      const contactId = parts.pop()!

      await this.services.tags.removeTagFromContact(contactId, tagId)
      return this.jsonResponse({ success: true, message: 'Tag removed from contact' }, 200, corsHeaders)
    }

    // POST /api/tags/suggest - AI tag suggestions
    if (path === '/api/tags/suggest' && method === 'POST') {
      const data = await request.json()

      const suggestions = await this.services.tags.suggestTags(data)
      return this.jsonResponse({ success: true, data: suggestions }, 200, corsHeaders)
    }

    // POST /api/tags/auto-tag/:contactId - Auto-tag contact with AI
    if (path.match(/^\/api\/tags\/auto-tag\/[^\/]+$/) && method === 'POST') {
      const contactId = path.split('/').pop()!
      const data = await request.json()

      const tags = await this.services.tags.autoTagContact(
        contactId,
        data,
        data.min_confidence || 0.7
      )

      return this.jsonResponse({ success: true, data: tags, message: `Applied ${tags.length} AI-suggested tags` }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private jsonResponse(
    data: any,
    status: number = 200,
    extraHeaders: Record<string, string> = {}
  ): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders
      }
    })
  }
}
