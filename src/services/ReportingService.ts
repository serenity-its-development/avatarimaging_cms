/**
 * ReportingService - AI-powered analytics and reporting
 * Generates reports with AI insights, handles scheduled reports
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { QueueGateway } from './ContactService'
import type {
  SavedReport,
  CreateSavedReportInput,
  UpdateSavedReportInput
} from '../types/entities'

export interface ReportingServiceContext {
  tenant_id: string
  user_id: string
}

export interface ReportData {
  title: string
  report_type: string
  generated_at: number
  parameters: any
  data: any
  ai_insights?: {
    summary: string
    findings: string[]
    recommendations: string[]
    anomalies: string[]
    trends: string[]
  }
  ai_cost_usd?: number
}

export interface ContactsReportData {
  total_contacts: number
  by_pipeline: Record<string, number>
  by_stage: Record<string, number>
  by_source: Record<string, number>
  warmness_distribution: {
    hot: number // 80-100
    warm: number // 50-79
    cool: number // 20-49
    cold: number // 0-19
  }
  average_warmness: number
  new_contacts_last_30_days: number
}

export interface BookingsReportData {
  total_bookings: number
  by_status: Record<string, number>
  by_service_type: Record<string, number>
  completion_rate: number
  no_show_rate: number
  cancellation_rate: number
  average_lead_time_hours: number
  bookings_last_30_days: number
}

export interface TouchpointsReportData {
  total_touchpoints: number
  by_channel: Record<string, number>
  by_type: Record<string, number>
  response_rate: number
  average_touches_to_booking: number
  touchpoints_last_30_days: number
}

export interface PerformanceReportData {
  contacts: ContactsReportData
  bookings: BookingsReportData
  touchpoints: TouchpointsReportData
  conversion_funnel: {
    new_leads: number
    contacted: number
    booked: number
    completed: number
    conversion_rate: number
  }
}

export class ReportingService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  /**
   * Generate contacts report with AI insights
   */
  async generateContactsReport(
    tenantId: string,
    parameters: {
      start_date?: number
      end_date?: number
      pipeline?: string
      include_ai_insights?: boolean
      ai_focus?: string
    },
    context: ReportingServiceContext
  ): Promise<ReportData> {
    const startDate = parameters.start_date || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = parameters.end_date || Date.now()

    // Get contacts data
    const allContacts = await this.db.contacts.list({ tenant_id: tenantId, limit: 10000 })

    // Calculate metrics
    const totalContacts = allContacts.total

    const byPipeline: Record<string, number> = {}
    const byStage: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    let totalWarmness = 0
    let warmnessCount = 0

    const warmnessDistribution = {
      hot: 0,
      warm: 0,
      cool: 0,
      cold: 0
    }

    let newContactsLast30Days = 0
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    for (const contact of allContacts.data) {
      // Pipeline
      byPipeline[contact.current_pipeline] = (byPipeline[contact.current_pipeline] || 0) + 1

      // Stage
      byStage[contact.current_stage] = (byStage[contact.current_stage] || 0) + 1

      // Source
      bySource[contact.source] = (bySource[contact.source] || 0) + 1

      // Warmness
      if (contact.warmness_score !== null && contact.warmness_score !== undefined) {
        totalWarmness += contact.warmness_score
        warmnessCount++

        if (contact.warmness_score >= 80) warmnessDistribution.hot++
        else if (contact.warmness_score >= 50) warmnessDistribution.warm++
        else if (contact.warmness_score >= 20) warmnessDistribution.cool++
        else warmnessDistribution.cold++
      }

      // New contacts
      if (contact.created_at >= thirtyDaysAgo) {
        newContactsLast30Days++
      }
    }

    const averageWarmness = warmnessCount > 0 ? totalWarmness / warmnessCount : 0

    const reportData: ContactsReportData = {
      total_contacts: totalContacts,
      by_pipeline: byPipeline,
      by_stage: byStage,
      by_source: bySource,
      warmness_distribution: warmnessDistribution,
      average_warmness: Math.round(averageWarmness * 100) / 100,
      new_contacts_last_30_days: newContactsLast30Days
    }

    // Generate AI insights if requested
    let aiInsights
    let aiCost = 0

    if (parameters.include_ai_insights !== false) {
      try {
        const { result, usage } = await this.ai.generateReportInsights(
          reportData,
          parameters.ai_focus
        )

        aiInsights = result
        aiCost = usage.cost_usd

        // Log AI usage
        await this.db.aiUsageLog.create({
          tenant_id: tenantId,
          model: usage.model,
          use_case: 'report_insights_contacts',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: JSON.stringify(reportData).length,
          output_size: JSON.stringify(result).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({ report_type: 'contacts' })
        })
      } catch (error) {
        console.error('Failed to generate AI insights:', error)
      }
    }

    return {
      title: 'Contacts Report',
      report_type: 'contacts',
      generated_at: Date.now(),
      parameters,
      data: reportData,
      ai_insights: aiInsights,
      ai_cost_usd: aiCost
    }
  }

  /**
   * Generate bookings report with AI insights
   */
  async generateBookingsReport(
    tenantId: string,
    parameters: {
      start_date?: number
      end_date?: number
      include_ai_insights?: boolean
      ai_focus?: string
    },
    context: ReportingServiceContext
  ): Promise<ReportData> {
    const startDate = parameters.start_date || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = parameters.end_date || Date.now()

    // Get bookings data
    const bookings = await this.db.bookings.list({
      tenant_id: tenantId,
      start_time_from: startDate,
      start_time_to: endDate,
      limit: 10000
    })

    const totalBookings = bookings.total

    const byStatus: Record<string, number> = {}
    const byServiceType: Record<string, number> = {}
    let totalLeadTime = 0
    let leadTimeCount = 0

    let bookingsLast30Days = 0
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    for (const booking of bookings.data) {
      // Status
      byStatus[booking.status] = (byStatus[booking.status] || 0) + 1

      // Service type
      byServiceType[booking.service_type] = (byServiceType[booking.service_type] || 0) + 1

      // Lead time
      if (booking.created_at && booking.start_time) {
        totalLeadTime += (booking.start_time - booking.created_at) / (1000 * 60 * 60)
        leadTimeCount++
      }

      // Recent bookings
      if (booking.created_at >= thirtyDaysAgo) {
        bookingsLast30Days++
      }
    }

    const completed = byStatus.completed || 0
    const noShow = byStatus.no_show || 0
    const cancelled = byStatus.cancelled || 0

    const completionRate = totalBookings > 0 ? (completed / totalBookings) * 100 : 0
    const noShowRate = totalBookings > 0 ? (noShow / totalBookings) * 100 : 0
    const cancellationRate = totalBookings > 0 ? (cancelled / totalBookings) * 100 : 0
    const averageLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0

    const reportData: BookingsReportData = {
      total_bookings: totalBookings,
      by_status: byStatus,
      by_service_type: byServiceType,
      completion_rate: Math.round(completionRate * 100) / 100,
      no_show_rate: Math.round(noShowRate * 100) / 100,
      cancellation_rate: Math.round(cancellationRate * 100) / 100,
      average_lead_time_hours: Math.round(averageLeadTime * 100) / 100,
      bookings_last_30_days: bookingsLast30Days
    }

    // Generate AI insights
    let aiInsights
    let aiCost = 0

    if (parameters.include_ai_insights !== false) {
      try {
        const { result, usage } = await this.ai.generateReportInsights(
          reportData,
          parameters.ai_focus
        )

        aiInsights = result
        aiCost = usage.cost_usd

        await this.db.aiUsageLog.create({
          tenant_id: tenantId,
          model: usage.model,
          use_case: 'report_insights_bookings',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: JSON.stringify(reportData).length,
          output_size: JSON.stringify(result).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({ report_type: 'bookings' })
        })
      } catch (error) {
        console.error('Failed to generate AI insights:', error)
      }
    }

    return {
      title: 'Bookings Report',
      report_type: 'bookings',
      generated_at: Date.now(),
      parameters,
      data: reportData,
      ai_insights: aiInsights,
      ai_cost_usd: aiCost
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    tenantId: string,
    parameters: {
      start_date?: number
      end_date?: number
      include_ai_insights?: boolean
      ai_focus?: string
    },
    context: ReportingServiceContext
  ): Promise<ReportData> {
    const startDate = parameters.start_date || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = parameters.end_date || Date.now()

    // Get all data in parallel
    const [contactsResult, bookingsResult, touchpointsResult] = await Promise.all([
      this.generateContactsReport(tenantId, { ...parameters, include_ai_insights: false }, context),
      this.generateBookingsReport(tenantId, { ...parameters, include_ai_insights: false }, context),
      this.generateTouchpointsReport(tenantId, { ...parameters, include_ai_insights: false }, context)
    ])

    // Calculate conversion funnel
    const contacts = await this.db.contacts.list({ tenant_id: tenantId, limit: 10000 })

    const newLeads = contacts.data.filter(c =>
      c.current_pipeline === 'new_lead' && c.created_at >= startDate && c.created_at <= endDate
    ).length

    const contacted = contacts.data.filter(c =>
      (c.current_pipeline === 'contacted' || c.current_pipeline === 'nurture') &&
      c.created_at >= startDate && c.created_at <= endDate
    ).length

    const bookings = await this.db.bookings.list({
      tenant_id: tenantId,
      start_time_from: startDate,
      start_time_to: endDate,
      limit: 10000
    })

    const booked = bookings.data.length
    const completed = bookings.data.filter(b => b.status === 'completed').length
    const conversionRate = newLeads > 0 ? (completed / newLeads) * 100 : 0

    const reportData: PerformanceReportData = {
      contacts: contactsResult.data as ContactsReportData,
      bookings: bookingsResult.data as BookingsReportData,
      touchpoints: touchpointsResult.data as TouchpointsReportData,
      conversion_funnel: {
        new_leads: newLeads,
        contacted,
        booked,
        completed,
        conversion_rate: Math.round(conversionRate * 100) / 100
      }
    }

    // Generate comprehensive AI insights
    let aiInsights
    let aiCost = 0

    if (parameters.include_ai_insights !== false) {
      try {
        const { result, usage } = await this.ai.generateReportInsights(
          reportData,
          parameters.ai_focus || 'Provide comprehensive business insights and actionable recommendations'
        )

        aiInsights = result
        aiCost = usage.cost_usd

        await this.db.aiUsageLog.create({
          tenant_id: tenantId,
          model: usage.model,
          use_case: 'report_insights_performance',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: JSON.stringify(reportData).length,
          output_size: JSON.stringify(result).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({ report_type: 'performance' })
        })
      } catch (error) {
        console.error('Failed to generate AI insights:', error)
      }
    }

    return {
      title: 'Performance Report',
      report_type: 'performance',
      generated_at: Date.now(),
      parameters,
      data: reportData,
      ai_insights: aiInsights,
      ai_cost_usd: aiCost
    }
  }

  /**
   * Generate touchpoints report
   */
  private async generateTouchpointsReport(
    tenantId: string,
    parameters: any,
    context: ReportingServiceContext
  ): Promise<ReportData> {
    const startDate = parameters.start_date || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = parameters.end_date || Date.now()

    // Get all contacts to fetch their touchpoints
    const contacts = await this.db.contacts.list({ tenant_id: tenantId, limit: 10000 })

    let totalTouchpoints = 0
    const byChannel: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let touchpointsLast30Days = 0
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    // This is a simplified version - in production you'd want a more efficient query
    for (const contact of contacts.data.slice(0, 100)) { // Limit to avoid timeout
      const touchpoints = await this.db.touchpoints.list({ contact_id: contact.id })

      for (const tp of touchpoints) {
        totalTouchpoints++

        byChannel[tp.channel] = (byChannel[tp.channel] || 0) + 1
        byType[tp.touchpoint_type] = (byType[tp.touchpoint_type] || 0) + 1

        if (tp.created_at >= thirtyDaysAgo) {
          touchpointsLast30Days++
        }
      }
    }

    const reportData: TouchpointsReportData = {
      total_touchpoints: totalTouchpoints,
      by_channel: byChannel,
      by_type: byType,
      response_rate: 0, // TODO: Calculate from touchpoint data
      average_touches_to_booking: 0, // TODO: Calculate
      touchpoints_last_30_days: touchpointsLast30Days
    }

    return {
      title: 'Touchpoints Report',
      report_type: 'touchpoints',
      generated_at: Date.now(),
      parameters,
      data: reportData
    }
  }

  /**
   * Save report configuration
   */
  async saveReport(
    data: CreateSavedReportInput,
    context: ReportingServiceContext
  ): Promise<SavedReport> {
    return this.db.savedReports.create(data)
  }

  /**
   * Update saved report
   */
  async updateSavedReport(
    id: string,
    data: UpdateSavedReportInput,
    context: ReportingServiceContext
  ): Promise<SavedReport> {
    return this.db.savedReports.update(id, data)
  }

  /**
   * Delete saved report
   */
  async deleteSavedReport(id: string): Promise<void> {
    return this.db.savedReports.delete(id)
  }

  /**
   * List saved reports
   */
  async listSavedReports(tenantId: string): Promise<SavedReport[]> {
    return this.db.savedReports.list(tenantId)
  }

  /**
   * Run scheduled reports (called by cron)
   */
  async runScheduledReports(): Promise<number> {
    const now = Date.now()
    const reports = await this.db.savedReports.findScheduled(now)

    let processed = 0

    for (const report of reports) {
      try {
        // Generate report based on type
        let reportData: ReportData

        const context: ReportingServiceContext = {
          tenant_id: report.tenant_id,
          user_id: report.created_by
        }

        if (report.report_type === 'contacts') {
          reportData = await this.generateContactsReport(
            report.tenant_id,
            { ...report.parameters, include_ai_insights: report.include_ai_insights, ai_focus: report.ai_focus },
            context
          )
        } else if (report.report_type === 'bookings') {
          reportData = await this.generateBookingsReport(
            report.tenant_id,
            { ...report.parameters, include_ai_insights: report.include_ai_insights, ai_focus: report.ai_focus },
            context
          )
        } else if (report.report_type === 'performance') {
          reportData = await this.generatePerformanceReport(
            report.tenant_id,
            { ...report.parameters, include_ai_insights: report.include_ai_insights, ai_focus: report.ai_focus },
            context
          )
        } else {
          continue
        }

        // Send to recipients
        for (const email of report.email_recipients) {
          await this.queue.send('email', {
            type: 'scheduled_report',
            to: email,
            subject: `${report.name} - ${new Date().toLocaleDateString()}`,
            report_data: reportData,
            tenant_id: report.tenant_id
          })
        }

        // Update last_run_at
        await this.db.savedReports.update(report.id, {
          last_run_at: now
          // TODO: Calculate next_run_at based on schedule (daily, weekly, monthly)
        })

        processed++
      } catch (error) {
        console.error(`Failed to run scheduled report ${report.id}:`, error)
      }
    }

    return processed
  }
}
