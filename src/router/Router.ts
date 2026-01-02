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

export class Router {
  private services: {
    contacts: ContactService
    bookings: BookingService
    sms: SMSService
    emailMarketing: EmailMarketingService
    reporting: ReportingService
    automation: AutomationService
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
      automation: new AutomationService(db, queue)
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

      // Report routes
      if (path.startsWith('/api/reports')) {
        return await this.handleReportRoutes(request, path, method, corsHeaders)
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

  private async handleReportRoutes(
    request: Request,
    path: string,
    method: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const context = { tenant_id: 'default', user_id: 'system' }

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

    // POST /webhooks/sms/incoming - ClickSend incoming SMS with AI intent detection
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
