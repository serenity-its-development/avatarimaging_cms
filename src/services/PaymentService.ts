/**
 * PaymentService - Handle Stripe payments and track payment records
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import type { Env } from '../types/env'
import { generateId } from '../utils/id'

export interface Payment {
  id: string
  tenant_id: string
  booking_id: string
  contact_id: string
  stripe_payment_intent_id?: string
  stripe_charge_id?: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  payment_method?: string
  discount_code_id?: string
  discount_amount: number
  influencer_id?: string
  metadata?: Record<string, any>
  created_at: number
  updated_at: number
}

export interface CreatePaymentIntentInput {
  tenant_id: string
  booking_id: string
  contact_id: string
  amount: number
  currency?: string
  discount_code_id?: string
  discount_amount?: number
  influencer_id?: string
  metadata?: Record<string, any>
}

export interface StripePaymentIntent {
  id: string
  client_secret: string
  amount: number
  currency: string
  status: string
}

export class PaymentService {
  constructor(
    private db: D1DatabaseGateway,
    private env: Env
  ) {}

  private parsePayment(row: any): Payment {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      booking_id: row.booking_id,
      contact_id: row.contact_id,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      stripe_charge_id: row.stripe_charge_id,
      amount: row.amount,
      currency: row.currency || 'AUD',
      status: row.status,
      payment_method: row.payment_method,
      discount_code_id: row.discount_code_id,
      discount_amount: row.discount_amount || 0,
      influencer_id: row.influencer_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<{ payment: Payment; clientSecret: string }> {
    if (!this.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured')
    }

    // Convert amount to cents for Stripe (Stripe uses smallest currency unit)
    const amountInCents = Math.round(input.amount * 100)

    // Create Stripe PaymentIntent
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        amount: amountInCents.toString(),
        currency: input.currency || 'aud',
        'automatic_payment_methods[enabled]': 'true',
        'metadata[booking_id]': input.booking_id,
        'metadata[contact_id]': input.contact_id,
        'metadata[tenant_id]': input.tenant_id
      })
    })

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json()
      throw new Error(`Stripe error: ${error.error?.message || 'Unknown error'}`)
    }

    const paymentIntent: StripePaymentIntent = await stripeResponse.json()

    // Create payment record in database
    const paymentId = `pay_${generateId()}`
    const now = Date.now()

    await this.db.raw(
      `INSERT INTO payments (
        id, tenant_id, booking_id, contact_id, stripe_payment_intent_id,
        amount, currency, status, discount_code_id, discount_amount,
        influencer_id, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        input.tenant_id,
        input.booking_id,
        input.contact_id,
        paymentIntent.id,
        input.amount,
        input.currency || 'AUD',
        input.discount_code_id || null,
        input.discount_amount || 0,
        input.influencer_id || null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now,
        now
      ]
    )

    const payment = await this.getById(input.tenant_id, paymentId)
    if (!payment) {
      throw new Error('Failed to create payment record')
    }

    return {
      payment,
      clientSecret: paymentIntent.client_secret
    }
  }

  async getById(tenantId: string, paymentId: string): Promise<Payment | null> {
    const rows = await this.db.raw(
      `SELECT * FROM payments WHERE tenant_id = ? AND id = ?`,
      [tenantId, paymentId]
    )

    // db.raw() already returns array directly
    return rows.length > 0 ? this.parsePayment(rows[0]) : null
  }

  async getByBookingId(tenantId: string, bookingId: string): Promise<Payment[]> {
    const rows = await this.db.raw(
      `SELECT * FROM payments WHERE tenant_id = ? AND booking_id = ? ORDER BY created_at DESC`,
      [tenantId, bookingId]
    )

    // db.raw() already returns array directly
    return rows.map(row => this.parsePayment(row))
  }

  async getByContactId(tenantId: string, contactId: string): Promise<Payment[]> {
    const rows = await this.db.raw(
      `SELECT * FROM payments WHERE tenant_id = ? AND contact_id = ? ORDER BY created_at DESC`,
      [tenantId, contactId]
    )

    // db.raw() already returns array directly
    return rows.map(row => this.parsePayment(row))
  }

  async updatePaymentStatus(
    tenantId: string,
    stripePaymentIntentId: string,
    status: 'succeeded' | 'failed' | 'refunded',
    chargeId?: string
  ): Promise<Payment | null> {
    const now = Date.now()

    await this.db.raw(
      `UPDATE payments
       SET status = ?, stripe_charge_id = ?, updated_at = ?
       WHERE tenant_id = ? AND stripe_payment_intent_id = ?`,
      [status, chargeId || null, now, tenantId, stripePaymentIntentId]
    )

    // Get the updated payment
    const rows = await this.db.raw(
      `SELECT * FROM payments WHERE tenant_id = ? AND stripe_payment_intent_id = ?`,
      [tenantId, stripePaymentIntentId]
    )

    // db.raw() already returns array directly
    if (rows.length === 0) {
      return null
    }

    const payment = this.parsePayment(rows[0])

    // If payment succeeded, update booking status and influencer stats
    if (status === 'succeeded') {
      await this.db.raw(
        `UPDATE bookings SET payment_status = 'paid', updated_at = ? WHERE id = ?`,
        [now, payment.booking_id]
      )

      // Update discount code usage if applicable
      if (payment.discount_code_id) {
        await this.db.raw(
          `UPDATE discount_codes SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?`,
          [now, payment.discount_code_id]
        )
      }

      // Update influencer stats if applicable
      if (payment.influencer_id) {
        await this.db.raw(
          `UPDATE influencers
           SET total_referrals = total_referrals + 1,
               total_revenue = total_revenue + ?,
               updated_at = ?
           WHERE id = ?`,
          [payment.amount, now, payment.influencer_id]
        )
      }
    }

    return payment
  }

  async handleWebhook(signature: string, body: string): Promise<{ success: boolean; message: string }> {
    if (!this.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret is not configured')
    }

    // In a production environment, you would verify the webhook signature here
    // For now, we'll parse the event directly
    const event = JSON.parse(body)

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const chargeId = paymentIntent.latest_charge

      await this.updatePaymentStatus(
        'default', // TODO: Get tenant from metadata
        paymentIntent.id,
        'succeeded',
        chargeId
      )

      return { success: true, message: 'Payment succeeded' }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object

      await this.updatePaymentStatus(
        'default',
        paymentIntent.id,
        'failed'
      )

      return { success: true, message: 'Payment failed' }
    }

    return { success: true, message: 'Event processed' }
  }

  async refund(tenantId: string, paymentId: string, amount?: number): Promise<Payment> {
    const payment = await this.getById(tenantId, paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'succeeded') {
      throw new Error('Can only refund succeeded payments')
    }

    if (!payment.stripe_payment_intent_id) {
      throw new Error('No Stripe payment intent found')
    }

    // Create refund in Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined
    const stripeResponse = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        payment_intent: payment.stripe_payment_intent_id,
        ...(refundAmount ? { amount: refundAmount.toString() } : {})
      })
    })

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json()
      throw new Error(`Stripe refund error: ${error.error?.message || 'Unknown error'}`)
    }

    // Update payment status
    await this.db.raw(
      `UPDATE payments SET status = 'refunded', updated_at = ? WHERE tenant_id = ? AND id = ?`,
      [Date.now(), tenantId, paymentId]
    )

    // Update booking status
    await this.db.raw(
      `UPDATE bookings SET payment_status = 'refunded', updated_at = ? WHERE id = ?`,
      [Date.now(), payment.booking_id]
    )

    const updatedPayment = await this.getById(tenantId, paymentId)
    if (!updatedPayment) {
      throw new Error('Failed to get updated payment')
    }

    return updatedPayment
  }

  async listByInfluencer(tenantId: string, influencerId: string, limit: number = 50): Promise<Payment[]> {
    const rows = await this.db.raw(
      `SELECT * FROM payments
       WHERE tenant_id = ? AND influencer_id = ? AND status = 'succeeded'
       ORDER BY created_at DESC
       LIMIT ?`,
      [tenantId, influencerId, limit]
    )

    // db.raw() already returns array directly
    return rows.map(row => this.parsePayment(row))
  }

  async getRevenueSummary(tenantId: string, startDate?: number, endDate?: number): Promise<any> {
    let query = `
      SELECT
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN discount_amount ELSE 0 END), 0) as total_discounts,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as total_refunds
      FROM payments
      WHERE tenant_id = ?
    `

    const params: any[] = [tenantId]

    if (startDate) {
      query += ` AND created_at >= ?`
      params.push(startDate)
    }

    if (endDate) {
      query += ` AND created_at <= ?`
      params.push(endDate)
    }

    const rows = await this.db.raw(query, params)
    // db.raw() already returns array directly
    return rows.length > 0 ? rows[0] : {
      total_payments: 0,
      total_revenue: 0,
      total_discounts: 0,
      total_refunds: 0
    }
  }
}
