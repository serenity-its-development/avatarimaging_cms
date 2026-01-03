/**
 * AI Booking Assistant - Automatically handle booking requests from messages
 *
 * Features:
 * - Detects cancellation/reschedule requests in messages
 * - Checks availability automatically
 * - Creates draft bookings for staff approval
 * - Auto-cancels with high confidence
 * - Suggests alternative times
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type { Booking, Contact } from '../types/entities'

export interface BookingDraft {
  id: string
  tenant_id: string
  original_booking_id?: string
  contact_id: string
  contact_name: string
  contact_phone?: string
  contact_email?: string
  action_type: 'create' | 'reschedule' | 'cancel'
  proposed_date?: number
  proposed_time?: string
  service_type?: string
  staff_id?: string
  duration_minutes: number
  ai_confidence: number
  ai_reasoning: string
  source_message: string
  source_channel: string
  detected_intent: string
  detected_entities?: Record<string, any>
  availability_checked: boolean
  is_available: boolean
  alternative_slots?: Array<{ date: number; time: string }>
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  reviewed_by?: string
  reviewed_at?: number
  review_notes?: string
  created_at: number
  created_by: string
  applied_at?: number
}

export interface AIAction {
  id: string
  tenant_id: string
  action_type: string
  entity_type: string
  entity_id?: string
  ai_model: string
  ai_confidence?: number
  ai_reasoning?: string
  input_data?: string
  output_data?: string
  status: 'pending' | 'success' | 'failed' | 'reviewed'
  error_message?: string
  requires_review: boolean
  reviewed_by?: string
  reviewed_at?: number
  review_decision?: string
  created_at: number
  completed_at?: number
}

export interface MessageIntent {
  intent: 'reschedule' | 'cancel' | 'confirm' | 'question' | 'unknown'
  confidence: number
  reasoning: string
  entities: {
    requested_date?: string // "next Tuesday", "2026-01-15"
    requested_time?: string // "2pm", "14:00"
    reason?: string
    urgency?: 'urgent' | 'normal' | 'flexible'
  }
  suggested_action: 'auto_cancel' | 'create_draft' | 'notify_staff' | 'auto_confirm'
}

export class AIBookingAssistant {
  constructor(
    private db: D1DatabaseGateway,
    private ai: AILayer
  ) {}

  /**
   * Process incoming message and detect booking-related intents
   */
  async processMessage(params: {
    contact_id: string
    message: string
    channel: 'sms' | 'instagram' | 'facebook' | 'whatsapp'
    tenant_id?: string
  }): Promise<{
    draft?: BookingDraft
    action?: AIAction
    auto_applied: boolean
  }> {
    const tenantId = params.tenant_id || 'default'

    // Get contact info
    const contact = await this.db.contacts.get(params.contact_id)
    if (!contact) {
      throw new Error('Contact not found')
    }

    // Get existing bookings for this contact
    const bookings = await this.getContactBookings(params.contact_id)

    // Use AI to detect intent
    const intent = await this.detectBookingIntent({
      message: params.message,
      contact,
      existingBookings: bookings,
    })

    // Log AI action
    const aiAction = await this.logAIAction({
      tenant_id: tenantId,
      action_type: 'message_intent_detection',
      entity_type: 'booking',
      ai_model: '@cf/meta/llama-3.1-8b-instruct',
      ai_confidence: intent.confidence,
      ai_reasoning: intent.reasoning,
      input_data: JSON.stringify({ message: params.message, contact_id: params.contact_id }),
      output_data: JSON.stringify(intent),
      requires_review: intent.confidence < 0.8,
    })

    // Handle based on intent
    let draft: BookingDraft | undefined

    if (intent.intent === 'cancel') {
      const result = await this.handleCancellation({
        contact,
        message: params.message,
        channel: params.channel,
        intent,
        existingBookings: bookings,
        aiActionId: aiAction.id,
      })
      draft = result.draft
    } else if (intent.intent === 'reschedule') {
      draft = await this.handleReschedule({
        contact,
        message: params.message,
        channel: params.channel,
        intent,
        existingBookings: bookings,
        aiActionId: aiAction.id,
      })
    }

    // Never auto-apply - always require staff approval
    return { draft, action: aiAction, auto_applied: false }
  }

  /**
   * Detect booking intent from message using AI
   */
  private async detectBookingIntent(params: {
    message: string
    contact: Contact
    existingBookings: Booking[]
  }): Promise<MessageIntent> {
    const upcomingBookings = params.existingBookings
      .filter(b => b.status === 'scheduled' && b.appointment_date > Date.now())
      .map(b => ({
        date: new Date(b.appointment_date).toLocaleDateString(),
        service: b.service_type,
      }))

    const prompt = `You are an AI assistant for a medical imaging clinic. Analyze this message from a patient and detect their intent.

PATIENT MESSAGE: "${params.message}"

CONTEXT:
- Patient name: ${params.contact.name}
- Upcoming appointments: ${upcomingBookings.length > 0 ? JSON.stringify(upcomingBookings) : 'None'}

TASK: Detect if this is a:
1. CANCEL - Patient wants to cancel an appointment
2. RESCHEDULE - Patient wants to change appointment time/date
3. CONFIRM - Patient is confirming their appointment
4. QUESTION - Patient has a question
5. UNKNOWN - Cannot determine intent

Extract any mentioned dates, times, or reasons.

Respond in JSON format:
{
  "intent": "cancel" | "reschedule" | "confirm" | "question" | "unknown",
  "confidence": 0.95,
  "reasoning": "Patient explicitly said 'I need to cancel'",
  "entities": {
    "requested_date": "2026-01-15",
    "requested_time": "14:00",
    "reason": "feeling unwell",
    "urgency": "urgent"
  },
  "suggested_action": "auto_cancel" | "create_draft" | "notify_staff"
}`

    try {
      const response = await this.ai.generateText(prompt, {
        systemPrompt: 'You are an expert at understanding patient intent in medical appointment scheduling. Be precise and conservative with high confidence scores.',
        temperature: 0.3,
        maxTokens: 512,
      })

      const result = JSON.parse(response)
      return result as MessageIntent
    } catch (error) {
      console.error('AI intent detection failed:', error)
      return {
        intent: 'unknown',
        confidence: 0,
        reasoning: 'Failed to parse AI response',
        entities: {},
        suggested_action: 'notify_staff',
      }
    }
  }

  /**
   * Handle cancellation request
   */
  private async handleCancellation(params: {
    contact: Contact
    message: string
    channel: string
    intent: MessageIntent
    existingBookings: Booking[]
    aiActionId: string
  }): Promise<{ draft?: BookingDraft; autoApplied: boolean }> {
    const upcomingBooking = params.existingBookings
      .filter(b => b.status === 'scheduled' && b.appointment_date > Date.now())
      .sort((a, b) => a.appointment_date - b.appointment_date)[0]

    if (!upcomingBooking) {
      // No booking to cancel
      return { autoApplied: false }
    }

    // Always create draft for staff review - no auto-actions
    // Staff must approve all AI-suggested changes
    const draft = await this.createBookingDraft({
      tenant_id: upcomingBooking.tenant_id,
      contact_id: params.contact.id,
      contact_name: params.contact.name,
      contact_phone: params.contact.phone,
      contact_email: params.contact.email,
      action_type: 'cancel',
      original_booking_id: upcomingBooking.id,
      ai_confidence: params.intent.confidence,
      ai_reasoning: params.intent.reasoning,
      source_message: params.message,
      source_channel: params.channel,
      detected_intent: params.intent.intent,
      detected_entities: params.intent.entities,
    })

    return { draft, autoApplied: false }
  }

  /**
   * Handle reschedule request
   */
  private async handleReschedule(params: {
    contact: Contact
    message: string
    channel: string
    intent: MessageIntent
    existingBookings: Booking[]
    aiActionId: string
  }): Promise<BookingDraft | undefined> {
    const upcomingBooking = params.existingBookings
      .filter(b => b.status === 'scheduled' && b.appointment_date > Date.now())
      .sort((a, b) => a.appointment_date - b.appointment_date)[0]

    if (!upcomingBooking) {
      return undefined
    }

    // Parse requested date/time
    const requestedDate = this.parseDate(params.intent.entities.requested_date)
    const requestedTime = params.intent.entities.requested_time

    // Check availability
    let isAvailable = false
    let alternativeSlots: Array<{ date: number; time: string }> = []

    if (requestedDate && requestedTime) {
      isAvailable = await this.checkAvailability({
        staff_id: upcomingBooking.staff_id,
        date: requestedDate,
        time: requestedTime,
        duration: upcomingBooking.duration_minutes || 30,
      })

      if (!isAvailable) {
        alternativeSlots = await this.findAlternativeSlots({
          staff_id: upcomingBooking.staff_id,
          preferred_date: requestedDate,
          duration: upcomingBooking.duration_minutes || 30,
        })
      }
    }

    // Create draft
    const draft = await this.createBookingDraft({
      tenant_id: upcomingBooking.tenant_id,
      contact_id: params.contact.id,
      contact_name: params.contact.name,
      contact_phone: params.contact.phone,
      contact_email: params.contact.email,
      action_type: 'reschedule',
      original_booking_id: upcomingBooking.id,
      proposed_date: requestedDate,
      proposed_time: requestedTime,
      service_type: upcomingBooking.service_type,
      staff_id: upcomingBooking.staff_id,
      duration_minutes: upcomingBooking.duration_minutes || 30,
      ai_confidence: params.intent.confidence,
      ai_reasoning: params.intent.reasoning,
      source_message: params.message,
      source_channel: params.channel,
      detected_intent: params.intent.intent,
      detected_entities: params.intent.entities,
      availability_checked: !!requestedDate && !!requestedTime,
      is_available: isAvailable,
      alternative_slots: alternativeSlots.length > 0 ? alternativeSlots : undefined,
    })

    return draft
  }

  /**
   * Create booking draft
   */
  private async createBookingDraft(data: Omit<BookingDraft, 'id' | 'created_at' | 'created_by' | 'status'>): Promise<BookingDraft> {
    const now = Date.now()

    const result = await this.db.raw(
      `INSERT INTO booking_drafts (
        tenant_id, original_booking_id, contact_id, contact_name, contact_phone, contact_email,
        action_type, proposed_date, proposed_time, service_type, staff_id, duration_minutes,
        ai_confidence, ai_reasoning, source_message, source_channel, detected_intent, detected_entities,
        availability_checked, is_available, alternative_slots, status, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'ai_assistant')
      RETURNING *`,
      [
        data.tenant_id,
        data.original_booking_id || null,
        data.contact_id,
        data.contact_name,
        data.contact_phone || null,
        data.contact_email || null,
        data.action_type,
        data.proposed_date || null,
        data.proposed_time || null,
        data.service_type || null,
        data.staff_id || null,
        data.duration_minutes,
        data.ai_confidence,
        data.ai_reasoning,
        data.source_message,
        data.source_channel,
        data.detected_intent,
        data.detected_entities ? JSON.stringify(data.detected_entities) : null,
        data.availability_checked ? 1 : 0,
        data.is_available ? 1 : 0,
        data.alternative_slots ? JSON.stringify(data.alternative_slots) : null,
        now,
      ]
    )

    const rows = result.results || []
    return this.parseBookingDraft(rows[0])
  }

  /**
   * Auto-cancel booking with high confidence
   */
  private async autoCancelBooking(params: {
    booking: Booking
    reason: string
    aiActionId: string
  }): Promise<void> {
    const now = Date.now()

    await this.db.raw(
      `UPDATE bookings
       SET status = 'cancelled',
           cancelled_at = ?,
           cancellation_reason = ?,
           cancelled_by = 'ai_assistant',
           last_ai_action_id = ?,
           updated_at = ?
       WHERE id = ?`,
      [now, params.reason, params.aiActionId, now, params.booking.id]
    )

    // Update AI action status
    await this.db.raw(
      `UPDATE ai_actions SET status = 'success', completed_at = ? WHERE id = ?`,
      [now, params.aiActionId]
    )
  }

  /**
   * Check availability for a time slot
   */
  private async checkAvailability(params: {
    staff_id?: string
    date: number
    time: string
    duration: number
  }): Promise<boolean> {
    if (!params.staff_id) return false

    // Check if there are any overlapping bookings
    const result = await this.db.raw(
      `SELECT COUNT(*) as count
       FROM bookings
       WHERE staff_id = ?
         AND status = 'scheduled'
         AND appointment_date = ?
         AND status != 'cancelled'`,
      [params.staff_id, params.date]
    )

    const rows = result.results || []
    return rows[0]?.count === 0
  }

  /**
   * Find alternative time slots
   */
  private async findAlternativeSlots(params: {
    staff_id?: string
    preferred_date: number
    duration: number
  }): Promise<Array<{ date: number; time: string }>> {
    // Simplified version - return next 3 days with common time slots
    const alternatives: Array<{ date: number; time: string }> = []
    const times = ['09:00', '11:00', '14:00', '16:00']

    for (let i = 1; i <= 3; i++) {
      const date = params.preferred_date + (i * 24 * 60 * 60 * 1000)
      for (const time of times) {
        const available = await this.checkAvailability({
          staff_id: params.staff_id,
          date,
          time,
          duration: params.duration,
        })
        if (available) {
          alternatives.push({ date, time })
          if (alternatives.length >= 3) return alternatives
        }
      }
    }

    return alternatives
  }

  /**
   * Get contact bookings
   */
  private async getContactBookings(contactId: string): Promise<Booking[]> {
    const result = await this.db.raw(
      `SELECT * FROM bookings WHERE contact_id = ? ORDER BY appointment_date DESC LIMIT 10`,
      [contactId]
    )
    return result.results as Booking[]
  }

  /**
   * Log AI action
   */
  private async logAIAction(data: Omit<AIAction, 'id' | 'created_at' | 'status'>): Promise<AIAction> {
    const now = Date.now()

    const result = await this.db.raw(
      `INSERT INTO ai_actions (
        tenant_id, action_type, entity_type, entity_id, ai_model, ai_confidence,
        ai_reasoning, input_data, output_data, requires_review, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      RETURNING *`,
      [
        data.tenant_id,
        data.action_type,
        data.entity_type,
        data.entity_id || null,
        data.ai_model,
        data.ai_confidence || null,
        data.ai_reasoning || null,
        data.input_data || null,
        data.output_data || null,
        data.requires_review ? 1 : 0,
        now,
      ]
    )

    const rows = result.results || []
    return rows[0] as AIAction
  }

  /**
   * Parse date string to timestamp
   */
  private parseDate(dateStr?: string): number | undefined {
    if (!dateStr) return undefined

    // Handle common formats
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }

    return undefined
  }

  /**
   * Parse booking draft from DB row
   */
  private parseBookingDraft(row: any): BookingDraft {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      original_booking_id: row.original_booking_id,
      contact_id: row.contact_id,
      contact_name: row.contact_name,
      contact_phone: row.contact_phone,
      contact_email: row.contact_email,
      action_type: row.action_type,
      proposed_date: row.proposed_date,
      proposed_time: row.proposed_time,
      service_type: row.service_type,
      staff_id: row.staff_id,
      duration_minutes: row.duration_minutes,
      ai_confidence: row.ai_confidence,
      ai_reasoning: row.ai_reasoning,
      source_message: row.source_message,
      source_channel: row.source_channel,
      detected_intent: row.detected_intent,
      detected_entities: row.detected_entities ? JSON.parse(row.detected_entities) : undefined,
      availability_checked: row.availability_checked === 1,
      is_available: row.is_available === 1,
      alternative_slots: row.alternative_slots ? JSON.parse(row.alternative_slots) : undefined,
      status: row.status,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes,
      created_at: row.created_at,
      created_by: row.created_by,
      applied_at: row.applied_at,
    }
  }

  /**
   * Get pending booking drafts for review
   */
  async getPendingDrafts(tenantId: string): Promise<BookingDraft[]> {
    const result = await this.db.raw(
      `SELECT * FROM booking_drafts
       WHERE tenant_id = ? AND status = 'pending'
       ORDER BY created_at DESC`,
      [tenantId]
    )

    const rows = result.results || []
    return rows.map((r: any) => this.parseBookingDraft(r))
  }

  /**
   * Approve and apply booking draft
   */
  async approveDraft(draftId: string, reviewedBy: string): Promise<void> {
    const now = Date.now()

    // Get draft
    const draftResult = await this.db.raw(
      `SELECT * FROM booking_drafts WHERE id = ?`,
      [draftId]
    )

    const rows = draftResult.results || []
    if (!rows.length) {
      throw new Error('Draft not found')
    }

    const draft = this.parseBookingDraft(rows[0])

    // Apply the action
    if (draft.action_type === 'cancel' && draft.original_booking_id) {
      await this.db.raw(
        `UPDATE bookings
         SET status = 'cancelled',
             cancelled_at = ?,
             cancellation_reason = ?,
             cancelled_by = ?,
             updated_at = ?
         WHERE id = ?`,
        [now, 'Cancelled per patient request', reviewedBy, now, draft.original_booking_id]
      )
    } else if (draft.action_type === 'reschedule' && draft.original_booking_id && draft.proposed_date) {
      await this.db.raw(
        `UPDATE bookings
         SET appointment_date = ?,
             updated_at = ?
         WHERE id = ?`,
        [draft.proposed_date, now, draft.original_booking_id]
      )
    }

    // Update draft status
    await this.db.raw(
      `UPDATE booking_drafts
       SET status = 'applied', reviewed_by = ?, reviewed_at = ?, applied_at = ?
       WHERE id = ?`,
      [reviewedBy, now, now, draftId]
    )
  }

  /**
   * Reject booking draft
   */
  async rejectDraft(draftId: string, reviewedBy: string, notes?: string): Promise<void> {
    const now = Date.now()

    await this.db.raw(
      `UPDATE booking_drafts
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_notes = ?
       WHERE id = ?`,
      [reviewedBy, now, notes || null, draftId]
    )
  }
}
