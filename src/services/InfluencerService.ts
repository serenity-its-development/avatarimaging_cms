/**
 * InfluencerService - Manage influencers and track their performance
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import { generateId } from '../utils/id'

export interface Influencer {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone?: string
  platform?: string
  handle?: string
  commission_rate: number
  total_referrals: number
  total_revenue: number
  is_active: boolean
  notes?: string
  created_at: number
  updated_at: number
}

export interface CreateInfluencerInput {
  tenant_id: string
  name: string
  email?: string
  phone?: string
  platform?: string
  handle?: string
  commission_rate?: number
  notes?: string
}

export interface UpdateInfluencerInput {
  name?: string
  email?: string
  phone?: string
  platform?: string
  handle?: string
  commission_rate?: number
  is_active?: boolean
  notes?: string
}

export interface InfluencerStats {
  influencer: Influencer
  total_referrals: number
  total_revenue: number
  total_commission: number
  discount_codes: number
  recent_referrals: any[]
}

export class InfluencerService {
  constructor(private db: D1DatabaseGateway) {}

  private parseInfluencer(row: any): Influencer {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      platform: row.platform,
      handle: row.handle,
      commission_rate: row.commission_rate || 0,
      total_referrals: row.total_referrals || 0,
      total_revenue: row.total_revenue || 0,
      is_active: row.is_active === 1,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  async list(tenantId: string, activeOnly: boolean = true): Promise<Influencer[]> {
    const query = activeOnly
      ? `SELECT * FROM influencers WHERE tenant_id = ? AND is_active = 1 ORDER BY name`
      : `SELECT * FROM influencers WHERE tenant_id = ? ORDER BY name`

    const result = await this.db.raw(query, [tenantId])
    const rows = result.results || []
    return rows.map(row => this.parseInfluencer(row))
  }

  async getById(tenantId: string, influencerId: string): Promise<Influencer | null> {
    const result = await this.db.raw(
      `SELECT * FROM influencers WHERE tenant_id = ? AND id = ?`,
      [tenantId, influencerId]
    )

    const rows = result.results || []
    return rows.length > 0 ? this.parseInfluencer(rows[0]) : null
  }

  async create(input: CreateInfluencerInput): Promise<Influencer> {
    const id = `inf_${generateId()}`
    const now = Date.now()

    await this.db.raw(
      `INSERT INTO influencers (
        id, tenant_id, name, email, phone, platform, handle,
        commission_rate, total_referrals, total_revenue, is_active, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?)`,
      [
        id,
        input.tenant_id,
        input.name,
        input.email || null,
        input.phone || null,
        input.platform || null,
        input.handle || null,
        input.commission_rate || 0,
        input.notes || null,
        now,
        now
      ]
    )

    const influencer = await this.getById(input.tenant_id, id)
    if (!influencer) {
      throw new Error('Failed to create influencer')
    }

    return influencer
  }

  async update(tenantId: string, influencerId: string, input: UpdateInfluencerInput): Promise<Influencer> {
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }
    if (input.email !== undefined) {
      updates.push('email = ?')
      values.push(input.email)
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?')
      values.push(input.phone)
    }
    if (input.platform !== undefined) {
      updates.push('platform = ?')
      values.push(input.platform)
    }
    if (input.handle !== undefined) {
      updates.push('handle = ?')
      values.push(input.handle)
    }
    if (input.commission_rate !== undefined) {
      updates.push('commission_rate = ?')
      values.push(input.commission_rate)
    }
    if (input.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(input.is_active ? 1 : 0)
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?')
      values.push(input.notes)
    }

    updates.push('updated_at = ?')
    values.push(Date.now())

    values.push(tenantId, influencerId)

    await this.db.raw(
      `UPDATE influencers SET ${updates.join(', ')} WHERE tenant_id = ? AND id = ?`,
      values
    )

    const influencer = await this.getById(tenantId, influencerId)
    if (!influencer) {
      throw new Error('Influencer not found')
    }

    return influencer
  }

  async delete(tenantId: string, influencerId: string): Promise<void> {
    // Soft delete - mark as inactive
    await this.db.raw(
      `UPDATE influencers SET is_active = 0, updated_at = ? WHERE tenant_id = ? AND id = ?`,
      [Date.now(), tenantId, influencerId]
    )
  }

  async getStats(tenantId: string, influencerId: string): Promise<InfluencerStats | null> {
    const influencer = await this.getById(tenantId, influencerId)
    if (!influencer) {
      return null
    }

    // Get total referrals and revenue from payments
    const statsResult = await this.db.raw(
      `SELECT
        COUNT(*) as total_referrals,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discount
       FROM payments
       WHERE influencer_id = ? AND status = 'succeeded'`,
      [influencerId]
    )

    const statsRows = statsResult.results || []
    const stats = statsRows.length > 0 ? statsRows[0] : { total_referrals: 0, total_revenue: 0, total_discount: 0 }

    // Get count of discount codes
    const codesResult = await this.db.raw(
      `SELECT COUNT(*) as count FROM discount_codes WHERE influencer_id = ? AND is_active = 1`,
      [influencerId]
    )

    const codesRows = codesResult.results || []
    const discountCodes = codesRows.length > 0 ? codesRows[0].count : 0

    // Get recent referrals
    const referralsResult = await this.db.raw(
      `SELECT p.*, c.name as contact_name, c.email as contact_email
       FROM payments p
       LEFT JOIN contacts c ON p.contact_id = c.id
       WHERE p.influencer_id = ?
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [influencerId]
    )

    const recentReferrals = referralsResult.results || []

    const totalCommission = (stats.total_revenue * influencer.commission_rate) / 100

    return {
      influencer,
      total_referrals: stats.total_referrals,
      total_revenue: stats.total_revenue,
      total_commission: totalCommission,
      discount_codes: discountCodes,
      recent_referrals: recentReferrals
    }
  }

  async updateStats(tenantId: string, influencerId: string): Promise<void> {
    // Recalculate and update total_referrals and total_revenue
    const statsResult = await this.db.raw(
      `SELECT
        COUNT(*) as total_referrals,
        COALESCE(SUM(amount), 0) as total_revenue
       FROM payments
       WHERE influencer_id = ? AND status = 'succeeded'`,
      [influencerId]
    )

    const statsRows = statsResult.results || []
    const stats = statsRows.length > 0 ? statsRows[0] : { total_referrals: 0, total_revenue: 0 }

    await this.db.raw(
      `UPDATE influencers SET total_referrals = ?, total_revenue = ?, updated_at = ? WHERE tenant_id = ? AND id = ?`,
      [stats.total_referrals, stats.total_revenue, Date.now(), tenantId, influencerId]
    )
  }
}
