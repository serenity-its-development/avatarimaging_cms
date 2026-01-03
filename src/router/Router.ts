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
import { EmailService } from '../services/EmailService'
import { ReportingService } from '../services/ReportingService'
import { AutomationService } from '../services/AutomationService'
import { PipelineService } from '../services/PipelineService'
import { TagService } from '../services/TagService'
import { StaffService } from '../services/StaffService'
import { TemplateService } from '../services/TemplateService'
import { ProcedureService } from '../services/ProcedureService'
import { DiscountCodeService } from '../services/DiscountCodeService'
import { InfluencerService } from '../services/InfluencerService'
import { PaymentService } from '../services/PaymentService'

export class Router {
  private services: {
    contacts: ContactService
    bookings: BookingService
    sms: SMSService
    emailMarketing: EmailMarketingService
    email: EmailService
    reporting: ReportingService
    automation: AutomationService
    pipelines: PipelineService
    tags: TagService
    staff: StaffService
    templates: TemplateService
    procedures: ProcedureService
    discountCodes: DiscountCodeService
    influencers: InfluencerService
    payments: PaymentService
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
      email: new EmailService(env, db),
      reporting: new ReportingService(db, ai, queue),
      automation: new AutomationService(db, queue),
      pipelines: new PipelineService(db),
      tags: new TagService(db, ai),
      staff: new StaffService(db, ai),
      templates: new TemplateService(db, ai),
      procedures: new ProcedureService(db),
      discountCodes: new DiscountCodeService(db),
      influencers: new InfluencerService(db),
      payments: new PaymentService(db, env)
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

      // Staff routes
      if (path.startsWith('/api/staff') || path.startsWith('/api/roles')) {
        return await this.handleStaffRoutes(request, path, method, corsHeaders)
      }

      // Template routes
      if (path.startsWith('/api/templates')) {
        return await this.handleTemplateRoutes(request, path, method, corsHeaders)
      }

      // Booking drafts routes (AI Assistant)
      if (path.startsWith('/api/booking-drafts')) {
        return await this.handleBookingDraftRoutes(request, path, method, corsHeaders)
      }

      // User preferences routes
      if (path.startsWith('/api/preferences')) {
        return await this.handlePreferencesRoutes(request, path, method, corsHeaders)
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

    // POST /api/public/bookings - Public booking endpoint (no auth required)
    if (path === '/api/public/bookings' && method === 'POST') {
      try {
        const data = await request.json()

        // Create or find contact
        let contact = null
        const existingContacts = await this.db.contacts.list({ tenant_id: 'default', limit: 1000 })
        const existing = existingContacts.data?.find((c: any) => c.email === data.contact_email)

        if (existing) {
          contact = existing
        } else {
          // Create new contact
          contact = await this.db.contacts.create({
            tenant_id: 'default',
            name: data.contact_name,
            email: data.contact_email,
            phone: data.contact_phone,
            source: 'public_booking',
            tags: ['online_booking']
          })
        }

        // Create booking
        const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}:00`)
        const booking = await this.db.bookings.create({
          tenant_id: 'default',
          contact_id: contact.id,
          contact_name: data.contact_name,
          service_type: data.service_type,
          scheduled_at: scheduledDateTime.getTime(),
          status: 'pending',
          notes: data.notes || '',
          source: 'public_widget'
        })

        // Send confirmation email
        try {
          await this.services.email.sendBookingConfirmation({
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            service_type: data.service_type,
            scheduled_date: data.scheduled_date,
            scheduled_time: data.scheduled_time,
            booking_id: booking.id,
            notes: data.notes
          })
          console.log('Booking confirmation email sent to:', data.contact_email)
        } catch (emailError: any) {
          console.error('Failed to send booking confirmation email:', emailError)
          // Don't fail the booking if email fails
        }

        // Send SMS confirmation
        if (data.contact_phone) {
          try {
            const formattedDate = new Date(data.scheduled_date).toLocaleDateString('en-AU', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })
            const smsMessage = `Hi ${data.contact_name}, your ${data.service_type} appointment is confirmed for ${formattedDate} at ${data.scheduled_time}. Booking ID: ${booking.id}. Avatar Imaging`

            await this.services.sms.sendSMS(context, {
              to: data.contact_phone,
              message: smsMessage
            })
            console.log('Booking confirmation SMS sent to:', data.contact_phone)
          } catch (smsError: any) {
            console.error('Failed to send booking confirmation SMS:', smsError)
            // Don't fail the booking if SMS fails
          }
        }

        return this.jsonResponse({
          success: true,
          booking_id: booking.id,
          message: 'Booking created successfully'
        }, 201, corsHeaders)
      } catch (error: any) {
        console.error('Public booking error:', error)
        return this.jsonResponse({
          success: false,
          error: error.message || 'Failed to create booking'
        }, 500, corsHeaders)
      }
    }

    // GET /api/bookings/availability?date=YYYY-MM-DD - Public availability check
    if (path === '/api/bookings/availability' && method === 'GET') {
      try {
        const url = new URL(request.url)
        const dateParam = url.searchParams.get('date')

        if (!dateParam) {
          return this.jsonResponse({ error: 'date parameter required (YYYY-MM-DD)' }, 400, corsHeaders)
        }

        // Get all bookings for the date
        const targetDate = new Date(dateParam)
        const dayStart = targetDate.setHours(0, 0, 0, 0)
        const dayEnd = targetDate.setHours(23, 59, 59, 999)

        const bookings = await this.db.bookings.list({ tenant_id: 'default', limit: 1000 })
        const dayBookings = bookings.data?.filter((b: any) =>
          b.scheduled_at >= dayStart && b.scheduled_at <= dayEnd
        ) || []

        // Generate all possible slots (9 AM - 5 PM, 30-min intervals)
        const allSlots: string[] = []
        for (let hour = 9; hour < 17; hour++) {
          for (let minute of [0, 30]) {
            allSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
          }
        }

        // Remove booked slots
        const bookedTimes = dayBookings.map((b: any) => {
          const d = new Date(b.scheduled_at)
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        })

        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot))

        return this.jsonResponse({ available_slots: availableSlots }, 200, corsHeaders)
      } catch (error: any) {
        console.error('Availability check error:', error)
        return this.jsonResponse({ error: error.message }, 500, corsHeaders)
      }
    }

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

    // GET /api/tasks/contact/:contactId - Get tasks for a contact
    if (path.match(/^\/api\/tasks\/contact\/[^\/]+$/) && method === 'GET') {
      const contactId = path.split('/').pop()!
      const tasks = await this.db.tasks.findByContact(contactId)

      return this.jsonResponse(tasks, 200, corsHeaders)
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

      // If assigned to AI, trigger AI processing
      if (data.assigned_to === 'ai_assistant') {
        // Queue AI task processing (async, don't wait)
        this.env.QUEUE.send({
          type: 'process_ai_task',
          taskId: task.id,
        }).catch(err => console.error('Failed to queue AI task:', err))
      }

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

    // POST /api/tasks/:id/process-ai - Manually trigger AI processing
    if (path.match(/^\/api\/tasks\/[^\/]+\/process-ai$/) && method === 'POST') {
      const id = path.split('/')[3]

      // Import and run AI task processor
      const { AITaskProcessor } = await import('../services/AITaskProcessor')
      const processor = new AITaskProcessor(this.db, this.ai)
      const result = await processor.processTask(id)

      return this.jsonResponse({ success: true, result }, 200, corsHeaders)
    }

    // POST /api/tasks/process-ai-pending - Process all pending AI tasks
    if (path === '/api/tasks/process-ai-pending' && method === 'POST') {
      const { AITaskProcessor } = await import('../services/AITaskProcessor')
      const processor = new AITaskProcessor(this.db, this.ai)
      const stats = await processor.processPendingAITasks()

      return this.jsonResponse({ success: true, stats }, 200, corsHeaders)
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

    // GET /api/reports/sources - Contact sources report
    if (path === '/api/reports/sources' && method === 'GET') {
      const url = new URL(request.url)
      const period = url.searchParams.get('period') || '30d'

      // Parse period (30d, 7d, 90d, etc.)
      const days = parseInt(period.replace('d', ''))
      const startDate = Date.now() - (days * 24 * 60 * 60 * 1000)

      // Get contact sources breakdown
      const result = await this.db.raw(
        `SELECT source, COUNT(*) as count
         FROM contacts
         WHERE created_at >= ?
         GROUP BY source
         ORDER BY count DESC`,
        [startDate]
      )

      const rows = result.results || []
      const sources = rows.map((r: any) => ({
        source: r.source || 'Unknown',
        count: r.count
      }))

      return this.jsonResponse({ success: true, data: sources }, 200, corsHeaders)
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

  private async handleStaffRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // ==========================================================================
    // ROLES
    // ==========================================================================

    // GET /api/roles - List all roles
    if (path === '/api/roles' && method === 'GET') {
      const url = new URL(request.url)
      const includeInactive = url.searchParams.get('include_inactive') === 'true'

      const roles = await this.services.staff.listRoles(includeInactive)
      return this.jsonResponse(roles, 200, corsHeaders)
    }

    // GET /api/roles/:id - Get role by ID
    if (path.match(/^\/api\/roles\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const role = await this.services.staff.getRoleById(id)

      if (!role) {
        return this.jsonResponse({ error: 'Role not found' }, 404, corsHeaders)
      }

      return this.jsonResponse(role, 200, corsHeaders)
    }

    // POST /api/roles - Create new role
    if (path === '/api/roles' && method === 'POST') {
      const data = await request.json()
      const role = await this.services.staff.createRole(data)
      return this.jsonResponse(role, 201, corsHeaders)
    }

    // PUT /api/roles/:id - Update role
    if (path.match(/^\/api\/roles\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      const role = await this.services.staff.updateRole(id, data)
      return this.jsonResponse(role, 200, corsHeaders)
    }

    // DELETE /api/roles/:id - Delete role
    if (path.match(/^\/api\/roles\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      await this.services.staff.deleteRole(id)
      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    // ==========================================================================
    // STAFF
    // ==========================================================================

    // GET /api/staff - List all staff
    if (path === '/api/staff' && method === 'GET') {
      const url = new URL(request.url)
      const includeInactive = url.searchParams.get('include_inactive') === 'true'
      const roleId = url.searchParams.get('role_id') || undefined
      const canBeAssigned = url.searchParams.get('can_be_assigned')
        ? url.searchParams.get('can_be_assigned') === 'true'
        : undefined

      const staff = await this.services.staff.listStaff({
        includeInactive,
        roleId,
        canBeAssigned
      })

      return this.jsonResponse(staff, 200, corsHeaders)
    }

    // GET /api/staff/:id - Get staff by ID
    if (path.match(/^\/api\/staff\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const staff = await this.services.staff.getStaffById(id)

      if (!staff) {
        return this.jsonResponse({ error: 'Staff member not found' }, 404, corsHeaders)
      }

      return this.jsonResponse(staff, 200, corsHeaders)
    }

    // POST /api/staff - Create new staff member
    if (path === '/api/staff' && method === 'POST') {
      const data = await request.json()
      const staff = await this.services.staff.createStaff(data)
      return this.jsonResponse(staff, 201, corsHeaders)
    }

    // PUT /api/staff/:id - Update staff member
    if (path.match(/^\/api\/staff\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()
      const staff = await this.services.staff.updateStaff(id, data)
      return this.jsonResponse(staff, 200, corsHeaders)
    }

    // DELETE /api/staff/:id - Delete (deactivate) staff member
    if (path.match(/^\/api\/staff\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!
      await this.services.staff.deleteStaff(id)
      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    // ==========================================================================
    // STAFF ASSIGNMENTS
    // ==========================================================================

    // GET /api/staff/assignments/contact/:contactId - Get assignments for contact
    if (path.match(/^\/api\/staff\/assignments\/contact\/[^\/]+$/) && method === 'GET') {
      const contactId = path.split('/').pop()!
      const assignments = await this.services.staff.getContactAssignments(contactId)
      return this.jsonResponse(assignments, 200, corsHeaders)
    }

    // GET /api/staff/assignments/staff/:staffId - Get assignments for staff member
    if (path.match(/^\/api\/staff\/assignments\/staff\/[^\/]+$/) && method === 'GET') {
      const staffId = path.split('/').pop()!
      const assignments = await this.services.staff.getStaffAssignments(staffId)
      return this.jsonResponse(assignments, 200, corsHeaders)
    }

    // POST /api/staff/assignments - Assign staff to contact
    if (path === '/api/staff/assignments' && method === 'POST') {
      const data = await request.json()
      const assignment = await this.services.staff.assignStaff(data)
      return this.jsonResponse(assignment, 201, corsHeaders)
    }

    // DELETE /api/staff/assignments/:contactId/:staffId - Unassign staff from contact
    if (path.match(/^\/api\/staff\/assignments\/[^\/]+\/[^\/]+$/) && method === 'DELETE') {
      const parts = path.split('/')
      const staffId = parts.pop()!
      const contactId = parts.pop()!
      await this.services.staff.unassignStaff(contactId, staffId)
      return this.jsonResponse({ success: true }, 200, corsHeaders)
    }

    // POST /api/staff/suggest - AI staff suggestions
    if (path === '/api/staff/suggest' && method === 'POST') {
      const data = await request.json()
      const suggestions = await this.services.staff.suggestStaff(
        data.contactData,
        data.assignmentType || 'primary'
      )
      return this.jsonResponse(suggestions, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleTemplateRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // GET /api/templates - List all templates
    if (path === '/api/templates' && method === 'GET') {
      const url = new URL(request.url)
      const category = url.searchParams.get('category') || undefined
      const activeOnly = url.searchParams.get('active_only') === 'true'
      const withQuickButtons = url.searchParams.get('with_quick_buttons') === 'true'
      const search = url.searchParams.get('search') || undefined

      const templates = await this.services.templates.listTemplates(context.tenant_id, {
        category,
        active_only: activeOnly,
        with_quick_buttons: withQuickButtons,
        search,
      })

      return this.jsonResponse({ success: true, data: templates }, 200, corsHeaders)
    }

    // GET /api/templates/quick-actions - Get quick action templates
    if (path === '/api/templates/quick-actions' && method === 'GET') {
      const url = new URL(request.url)
      const category = url.searchParams.get('category') || undefined

      const templates = await this.services.templates.getQuickActionTemplates(context.tenant_id, category)
      return this.jsonResponse({ success: true, data: templates }, 200, corsHeaders)
    }

    // GET /api/templates/default/:category - Get default template for category
    if (path.match(/^\/api\/templates\/default\/\w+$/) && method === 'GET') {
      const category = path.split('/').pop()!
      const template = await this.services.templates.getDefaultTemplate(context.tenant_id, category)

      if (!template) {
        return this.jsonResponse({ error: 'No default template found for this category' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: template }, 200, corsHeaders)
    }

    // GET /api/templates/:id - Get template by ID
    if (path.match(/^\/api\/templates\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!

      // Skip if it's a special route
      if (id === 'quick-actions' || id === 'default') {
        return this.jsonResponse({ error: 'Invalid route' }, 400, corsHeaders)
      }

      const template = await this.services.templates.getTemplateById(id)
      if (!template) {
        return this.jsonResponse({ error: 'Template not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: template }, 200, corsHeaders)
    }

    // POST /api/templates - Create new template
    if (path === '/api/templates' && method === 'POST') {
      const data = await request.json()
      const template = await this.services.templates.createTemplate({
        ...data,
        tenant_id: context.tenant_id,
      })

      return this.jsonResponse({ success: true, data: template }, 201, corsHeaders)
    }

    // PUT /api/templates/:id - Update template
    if (path.match(/^\/api\/templates\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const template = await this.services.templates.updateTemplate(id, data)
      return this.jsonResponse({ success: true, data: template }, 200, corsHeaders)
    }

    // DELETE /api/templates/:id - Delete template
    if (path.match(/^\/api\/templates\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!

      await this.services.templates.deleteTemplate(id)
      return this.jsonResponse({ success: true, message: 'Template deleted' }, 200, corsHeaders)
    }

    // POST /api/templates/:id/render - Render template with variables
    if (path.match(/^\/api\/templates\/[^\/]+\/render$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()

      const result = await this.services.templates.renderTemplate({
        template_id: id,
        variables: data.variables || {},
      })

      return this.jsonResponse({ success: true, data: result }, 200, corsHeaders)
    }

    // POST /api/templates/:id/execute - Execute AI template
    if (path.match(/^\/api\/templates\/[^\/]+\/execute$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()

      const result = await this.services.templates.executeAITemplate(id, data.variables || {})
      return this.jsonResponse({ success: true, data: { result } }, 200, corsHeaders)
    }

    // POST /api/templates/:id/duplicate - Duplicate template
    if (path.match(/^\/api\/templates\/[^\/]+\/duplicate$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()

      if (!data.new_name) {
        return this.jsonResponse({ error: 'new_name is required' }, 400, corsHeaders)
      }

      const template = await this.services.templates.duplicateTemplate(id, data.new_name)
      return this.jsonResponse({ success: true, data: template }, 201, corsHeaders)
    }

    // =====================================================================
    // PROCEDURES ENDPOINTS
    // =====================================================================

    // GET /api/procedures - List all procedures
    if (path === '/api/procedures' && method === 'GET') {
      const activeOnly = url.searchParams.get('active_only') !== 'false'
      const procedures = await this.services.procedures.list(context.tenant_id, activeOnly)
      return this.jsonResponse({ success: true, data: procedures }, 200, corsHeaders)
    }

    // GET /api/procedures/:id - Get procedure by ID
    if (path.match(/^\/api\/procedures\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const procedure = await this.services.procedures.getById(context.tenant_id, id)

      if (!procedure) {
        return this.jsonResponse({ error: 'Procedure not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: procedure }, 200, corsHeaders)
    }

    // POST /api/procedures - Create new procedure
    if (path === '/api/procedures' && method === 'POST') {
      const data = await request.json()
      const procedure = await this.services.procedures.create({
        ...data,
        tenant_id: context.tenant_id
      })

      return this.jsonResponse({ success: true, data: procedure }, 201, corsHeaders)
    }

    // PUT /api/procedures/:id - Update procedure
    if (path.match(/^\/api\/procedures\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const procedure = await this.services.procedures.update(context.tenant_id, id, data)
      return this.jsonResponse({ success: true, data: procedure }, 200, corsHeaders)
    }

    // DELETE /api/procedures/:id - Delete (soft delete) procedure
    if (path.match(/^\/api\/procedures\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!

      await this.services.procedures.delete(context.tenant_id, id)
      return this.jsonResponse({ success: true, message: 'Procedure deleted' }, 200, corsHeaders)
    }

    // POST /api/procedures/calculate-price - Calculate price with discount
    if (path === '/api/procedures/calculate-price' && method === 'POST') {
      const data = await request.json()
      const pricing = await this.services.procedures.calculatePrice(
        data.procedure_id,
        data.discount_code,
        context.tenant_id
      )

      return this.jsonResponse({ success: true, data: pricing }, 200, corsHeaders)
    }

    // =====================================================================
    // DISCOUNT CODES ENDPOINTS
    // =====================================================================

    // GET /api/discount-codes - List all discount codes
    if (path === '/api/discount-codes' && method === 'GET') {
      const activeOnly = url.searchParams.get('active_only') !== 'false'
      const discountCodes = await this.services.discountCodes.list(context.tenant_id, activeOnly)
      return this.jsonResponse({ success: true, data: discountCodes }, 200, corsHeaders)
    }

    // GET /api/discount-codes/:id - Get discount code by ID
    if (path.match(/^\/api\/discount-codes\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const discountCode = await this.services.discountCodes.getById(context.tenant_id, id)

      if (!discountCode) {
        return this.jsonResponse({ error: 'Discount code not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: discountCode }, 200, corsHeaders)
    }

    // POST /api/discount-codes - Create new discount code
    if (path === '/api/discount-codes' && method === 'POST') {
      const data = await request.json()

      try {
        const discountCode = await this.services.discountCodes.create({
          ...data,
          tenant_id: context.tenant_id
        })

        return this.jsonResponse({ success: true, data: discountCode }, 201, corsHeaders)
      } catch (error: any) {
        return this.jsonResponse({ error: error.message }, 400, corsHeaders)
      }
    }

    // PUT /api/discount-codes/:id - Update discount code
    if (path.match(/^\/api\/discount-codes\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const discountCode = await this.services.discountCodes.update(context.tenant_id, id, data)
      return this.jsonResponse({ success: true, data: discountCode }, 200, corsHeaders)
    }

    // DELETE /api/discount-codes/:id - Delete (soft delete) discount code
    if (path.match(/^\/api\/discount-codes\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!

      await this.services.discountCodes.delete(context.tenant_id, id)
      return this.jsonResponse({ success: true, message: 'Discount code deleted' }, 200, corsHeaders)
    }

    // POST /api/discount-codes/validate - Validate discount code
    if (path === '/api/discount-codes/validate' && method === 'POST') {
      const data = await request.json()
      const result = await this.services.discountCodes.validate(
        context.tenant_id,
        data.code,
        data.contact_id,
        data.procedure_id,
        data.purchase_amount
      )

      return this.jsonResponse({ success: true, data: result }, 200, corsHeaders)
    }

    // =====================================================================
    // INFLUENCERS ENDPOINTS
    // =====================================================================

    // GET /api/influencers - List all influencers
    if (path === '/api/influencers' && method === 'GET') {
      const activeOnly = url.searchParams.get('active_only') !== 'false'
      const influencers = await this.services.influencers.list(context.tenant_id, activeOnly)
      return this.jsonResponse({ success: true, data: influencers }, 200, corsHeaders)
    }

    // GET /api/influencers/:id - Get influencer by ID
    if (path.match(/^\/api\/influencers\/[^\/]+$/) && method === 'GET') {
      const id = path.split('/').pop()!
      const influencer = await this.services.influencers.getById(context.tenant_id, id)

      if (!influencer) {
        return this.jsonResponse({ error: 'Influencer not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: influencer }, 200, corsHeaders)
    }

    // GET /api/influencers/:id/stats - Get influencer performance stats
    if (path.match(/^\/api\/influencers\/[^\/]+\/stats$/) && method === 'GET') {
      const id = path.split('/')[3]
      const stats = await this.services.influencers.getStats(context.tenant_id, id)

      if (!stats) {
        return this.jsonResponse({ error: 'Influencer not found' }, 404, corsHeaders)
      }

      return this.jsonResponse({ success: true, data: stats }, 200, corsHeaders)
    }

    // POST /api/influencers - Create new influencer
    if (path === '/api/influencers' && method === 'POST') {
      const data = await request.json()
      const influencer = await this.services.influencers.create({
        ...data,
        tenant_id: context.tenant_id
      })

      return this.jsonResponse({ success: true, data: influencer }, 201, corsHeaders)
    }

    // PUT /api/influencers/:id - Update influencer
    if (path.match(/^\/api\/influencers\/[^\/]+$/) && method === 'PUT') {
      const id = path.split('/').pop()!
      const data = await request.json()

      const influencer = await this.services.influencers.update(context.tenant_id, id, data)
      return this.jsonResponse({ success: true, data: influencer }, 200, corsHeaders)
    }

    // DELETE /api/influencers/:id - Delete (soft delete) influencer
    if (path.match(/^\/api\/influencers\/[^\/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!

      await this.services.influencers.delete(context.tenant_id, id)
      return this.jsonResponse({ success: true, message: 'Influencer deleted' }, 200, corsHeaders)
    }

    // =====================================================================
    // PAYMENTS ENDPOINTS
    // =====================================================================

    // POST /api/payments/create-intent - Create Stripe payment intent
    if (path === '/api/payments/create-intent' && method === 'POST') {
      const data = await request.json()

      try {
        const result = await this.services.payments.createPaymentIntent({
          tenant_id: context.tenant_id,
          booking_id: data.booking_id,
          contact_id: data.contact_id,
          amount: data.amount,
          currency: data.currency || 'aud',
          discount_code_id: data.discount_code_id,
          discount_amount: data.discount_amount || 0,
          influencer_id: data.influencer_id,
          metadata: data.metadata
        })

        return this.jsonResponse({ success: true, data: result }, 200, corsHeaders)
      } catch (error: any) {
        return this.jsonResponse({ error: error.message }, 400, corsHeaders)
      }
    }

    // POST /api/payments/webhook - Stripe webhook handler
    if (path === '/api/payments/webhook' && method === 'POST') {
      const signature = request.headers.get('stripe-signature') || ''
      const body = await request.text()

      try {
        const result = await this.services.payments.handleWebhook(signature, body)
        return this.jsonResponse(result, 200, corsHeaders)
      } catch (error: any) {
        return this.jsonResponse({ error: error.message }, 400, corsHeaders)
      }
    }

    // GET /api/payments/booking/:bookingId - Get payments for a booking
    if (path.match(/^\/api\/payments\/booking\/[^\/]+$/) && method === 'GET') {
      const bookingId = path.split('/').pop()!
      const payments = await this.services.payments.getByBookingId(context.tenant_id, bookingId)

      return this.jsonResponse({ success: true, data: payments }, 200, corsHeaders)
    }

    // GET /api/payments/contact/:contactId - Get payments for a contact
    if (path.match(/^\/api\/payments\/contact\/[^\/]+$/) && method === 'GET') {
      const contactId = path.split('/').pop()!
      const payments = await this.services.payments.getByContactId(context.tenant_id, contactId)

      return this.jsonResponse({ success: true, data: payments }, 200, corsHeaders)
    }

    // POST /api/payments/:id/refund - Refund a payment
    if (path.match(/^\/api\/payments\/[^\/]+\/refund$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()

      try {
        const payment = await this.services.payments.refund(context.tenant_id, id, data.amount)
        return this.jsonResponse({ success: true, data: payment }, 200, corsHeaders)
      } catch (error: any) {
        return this.jsonResponse({ error: error.message }, 400, corsHeaders)
      }
    }

    // GET /api/payments/revenue-summary - Get revenue summary
    if (path === '/api/payments/revenue-summary' && method === 'GET') {
      const startDate = url.searchParams.get('start_date')
      const endDate = url.searchParams.get('end_date')

      const summary = await this.services.payments.getRevenueSummary(
        context.tenant_id,
        startDate ? parseInt(startDate) : undefined,
        endDate ? parseInt(endDate) : undefined
      )

      return this.jsonResponse({ success: true, data: summary }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handleBookingDraftRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // Import AIBookingAssistant dynamically
    const { AIBookingAssistant } = await import('../services/AIBookingAssistant')
    const bookingAssistant = new AIBookingAssistant(this.db, this.ai)

    // GET /api/booking-drafts - List pending drafts
    if (path === '/api/booking-drafts' && method === 'GET') {
      const drafts = await bookingAssistant.getPendingDrafts(context.tenant_id)
      return this.jsonResponse({ success: true, data: drafts }, 200, corsHeaders)
    }

    // POST /api/booking-drafts/:id/approve - Approve and apply draft
    if (path.match(/^\/api\/booking-drafts\/[^\/]+\/approve$/) && method === 'POST') {
      const id = path.split('/')[3]
      await bookingAssistant.approveDraft(id, context.user_id)
      return this.jsonResponse({ success: true, message: 'Draft approved and applied' }, 200, corsHeaders)
    }

    // POST /api/booking-drafts/:id/reject - Reject draft
    if (path.match(/^\/api\/booking-drafts\/[^\/]+\/reject$/) && method === 'POST') {
      const id = path.split('/')[3]
      const data = await request.json()
      await bookingAssistant.rejectDraft(id, context.user_id, data.notes)
      return this.jsonResponse({ success: true, message: 'Draft rejected' }, 200, corsHeaders)
    }

    return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders)
  }

  private async handlePreferencesRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

    // Import UserPreferencesService
    const { UserPreferencesService } = await import('../services/UserPreferencesService')
    const preferencesService = new UserPreferencesService(this.db)

    // GET /api/preferences - Get user preferences
    if (path === '/api/preferences' && method === 'GET') {
      const preferences = await preferencesService.getUserPreferences(
        context.tenant_id,
        context.user_id
      )
      return this.jsonResponse({ success: true, data: preferences }, 200, corsHeaders)
    }

    // PATCH /api/preferences - Update user preferences
    if (path === '/api/preferences' && method === 'PATCH') {
      const updates = await request.json()
      const preferences = await preferencesService.updatePreferences(
        context.tenant_id,
        context.user_id,
        updates
      )
      return this.jsonResponse({ success: true, data: preferences }, 200, corsHeaders)
    }

    // POST /api/preferences/reset - Reset to defaults
    if (path === '/api/preferences/reset' && method === 'POST') {
      const preferences = await preferencesService.resetPreferences(
        context.tenant_id,
        context.user_id
      )
      return this.jsonResponse({ success: true, data: preferences }, 200, corsHeaders)
    }

    // GET /api/preferences/history - Get change history
    if (path === '/api/preferences/history' && method === 'GET') {
      const history = await preferencesService.getPreferenceHistory(
        context.tenant_id,
        context.user_id
      )
      return this.jsonResponse({ success: true, data: history }, 200, corsHeaders)
    }

    // GET /api/preferences/export - Export preferences
    if (path === '/api/preferences/export' && method === 'GET') {
      const exported = await preferencesService.exportPreferences(
        context.tenant_id,
        context.user_id
      )
      return new Response(exported, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="preferences.json"',
          ...corsHeaders,
        },
      })
    }

    // POST /api/preferences/import - Import preferences
    if (path === '/api/preferences/import' && method === 'POST') {
      const data = await request.json()
      const preferences = await preferencesService.importPreferences(
        context.tenant_id,
        context.user_id,
        JSON.stringify(data)
      )
      return this.jsonResponse({ success: true, data: preferences }, 200, corsHeaders)
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
