/**
 * DiscountCodeService - Manage discount codes tied to influencers
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import { generateId } from '../utils/id'

export interface DiscountCode {
  id: string
  tenant_id: string
  code: string
  influencer_id?: string
  influencer_name?: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_purchase_amount: number
  max_discount_amount?: number
  usage_limit?: number
  usage_count: number
  per_customer_limit: number
  valid_from?: number
  valid_until?: number
  applicable_procedures?: string[]
  is_active: boolean
  notes?: string
  created_at: number
  updated_at: number
}

export interface CreateDiscountCodeInput {
  tenant_id: string
  code: string
  influencer_id?: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  per_customer_limit?: number
  valid_from?: number
  valid_until?: number
  applicable_procedures?: string[]
  notes?: string
}

export interface UpdateDiscountCodeInput {
  code?: string
  influencer_id?: string
  discount_type?: 'percentage' | 'fixed_amount'
  discount_value?: number
  min_purchase_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  per_customer_limit?: number
  valid_from?: number
  valid_until?: number
  applicable_procedures?: string[]
  is_active?: boolean
  notes?: string
}

export interface ValidateDiscountResult {
  valid: boolean
  discount?: DiscountCode
  error?: string
}

export class DiscountCodeService {
  constructor(private db: D1DatabaseGateway) {}

  private parseDiscountCode(row: any): DiscountCode {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      code: row.code,
      influencer_id: row.influencer_id,
      influencer_name: row.influencer_name,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      min_purchase_amount: row.min_purchase_amount || 0,
      max_discount_amount: row.max_discount_amount,
      usage_limit: row.usage_limit,
      usage_count: row.usage_count || 0,
      per_customer_limit: row.per_customer_limit || 1,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      applicable_procedures: row.applicable_procedures ? JSON.parse(row.applicable_procedures) : undefined,
      is_active: row.is_active === 1,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  async list(tenantId: string, activeOnly: boolean = true): Promise<DiscountCode[]> {
    const query = activeOnly
      ? `SELECT dc.*, i.name as influencer_name
         FROM discount_codes dc
         LEFT JOIN influencers i ON dc.influencer_id = i.id
         WHERE dc.tenant_id = ? AND dc.is_active = 1
         ORDER BY dc.created_at DESC`
      : `SELECT dc.*, i.name as influencer_name
         FROM discount_codes dc
         LEFT JOIN influencers i ON dc.influencer_id = i.id
         WHERE dc.tenant_id = ?
         ORDER BY dc.created_at DESC`

    const result = await this.db.raw(query, [tenantId])
    const rows = result.results || []
    return rows.map(row => this.parseDiscountCode(row))
  }

  async getById(tenantId: string, discountId: string): Promise<DiscountCode | null> {
    const result = await this.db.raw(
      `SELECT dc.*, i.name as influencer_name
       FROM discount_codes dc
       LEFT JOIN influencers i ON dc.influencer_id = i.id
       WHERE dc.tenant_id = ? AND dc.id = ?`,
      [tenantId, discountId]
    )

    const rows = result.results || []
    return rows.length > 0 ? this.parseDiscountCode(rows[0]) : null
  }

  async getByCode(tenantId: string, code: string): Promise<DiscountCode | null> {
    const result = await this.db.raw(
      `SELECT dc.*, i.name as influencer_name
       FROM discount_codes dc
       LEFT JOIN influencers i ON dc.influencer_id = i.id
       WHERE dc.tenant_id = ? AND dc.code = ?`,
      [tenantId, code]
    )

    const rows = result.results || []
    return rows.length > 0 ? this.parseDiscountCode(rows[0]) : null
  }

  async create(input: CreateDiscountCodeInput): Promise<DiscountCode> {
    const id = `disc_${generateId()}`
    const now = Date.now()

    // Check if code already exists
    const existing = await this.getByCode(input.tenant_id, input.code)
    if (existing) {
      throw new Error('Discount code already exists')
    }

    await this.db.raw(
      `INSERT INTO discount_codes (
        id, tenant_id, code, influencer_id, discount_type, discount_value,
        min_purchase_amount, max_discount_amount, usage_limit, usage_count,
        per_customer_limit, valid_from, valid_until, applicable_procedures,
        is_active, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        input.tenant_id,
        input.code.toUpperCase(),
        input.influencer_id || null,
        input.discount_type,
        input.discount_value,
        input.min_purchase_amount || 0,
        input.max_discount_amount || null,
        input.usage_limit || null,
        input.per_customer_limit || 1,
        input.valid_from || null,
        input.valid_until || null,
        input.applicable_procedures ? JSON.stringify(input.applicable_procedures) : null,
        input.notes || null,
        now,
        now
      ]
    )

    const discount = await this.getById(input.tenant_id, id)
    if (!discount) {
      throw new Error('Failed to create discount code')
    }

    return discount
  }

  async update(tenantId: string, discountId: string, input: UpdateDiscountCodeInput): Promise<DiscountCode> {
    const updates: string[] = []
    const values: any[] = []

    if (input.code !== undefined) {
      updates.push('code = ?')
      values.push(input.code.toUpperCase())
    }
    if (input.influencer_id !== undefined) {
      updates.push('influencer_id = ?')
      values.push(input.influencer_id)
    }
    if (input.discount_type !== undefined) {
      updates.push('discount_type = ?')
      values.push(input.discount_type)
    }
    if (input.discount_value !== undefined) {
      updates.push('discount_value = ?')
      values.push(input.discount_value)
    }
    if (input.min_purchase_amount !== undefined) {
      updates.push('min_purchase_amount = ?')
      values.push(input.min_purchase_amount)
    }
    if (input.max_discount_amount !== undefined) {
      updates.push('max_discount_amount = ?')
      values.push(input.max_discount_amount)
    }
    if (input.usage_limit !== undefined) {
      updates.push('usage_limit = ?')
      values.push(input.usage_limit)
    }
    if (input.per_customer_limit !== undefined) {
      updates.push('per_customer_limit = ?')
      values.push(input.per_customer_limit)
    }
    if (input.valid_from !== undefined) {
      updates.push('valid_from = ?')
      values.push(input.valid_from)
    }
    if (input.valid_until !== undefined) {
      updates.push('valid_until = ?')
      values.push(input.valid_until)
    }
    if (input.applicable_procedures !== undefined) {
      updates.push('applicable_procedures = ?')
      values.push(JSON.stringify(input.applicable_procedures))
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

    values.push(tenantId, discountId)

    await this.db.raw(
      `UPDATE discount_codes SET ${updates.join(', ')} WHERE tenant_id = ? AND id = ?`,
      values
    )

    const discount = await this.getById(tenantId, discountId)
    if (!discount) {
      throw new Error('Discount code not found')
    }

    return discount
  }

  async delete(tenantId: string, discountId: string): Promise<void> {
    // Soft delete - mark as inactive
    await this.db.raw(
      `UPDATE discount_codes SET is_active = 0, updated_at = ? WHERE tenant_id = ? AND id = ?`,
      [Date.now(), tenantId, discountId]
    )
  }

  async validate(
    tenantId: string,
    code: string,
    contactId: string,
    procedureId?: string,
    purchaseAmount?: number
  ): Promise<ValidateDiscountResult> {
    const discount = await this.getByCode(tenantId, code.toUpperCase())

    if (!discount) {
      return { valid: false, error: 'Invalid discount code' }
    }

    if (!discount.is_active) {
      return { valid: false, error: 'Discount code is inactive' }
    }

    const now = Date.now()

    // Check valid date range
    if (discount.valid_from && now < discount.valid_from) {
      return { valid: false, error: 'Discount code is not yet valid' }
    }

    if (discount.valid_until && now > discount.valid_until) {
      return { valid: false, error: 'Discount code has expired' }
    }

    // Check usage limits
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return { valid: false, error: 'Discount code has reached its usage limit' }
    }

    // Check per-customer limit
    if (contactId) {
      const usageResult = await this.db.raw(
        `SELECT COUNT(*) as count FROM payments WHERE contact_id = ? AND discount_code_id = ?`,
        [contactId, discount.id]
      )
      const usageRows = usageResult.results || []
      const customerUsage = usageRows.length > 0 ? usageRows[0].count : 0

      if (customerUsage >= discount.per_customer_limit) {
        return { valid: false, error: 'You have already used this discount code' }
      }
    }

    // Check applicable procedures
    if (procedureId && discount.applicable_procedures && discount.applicable_procedures.length > 0) {
      if (!discount.applicable_procedures.includes(procedureId)) {
        return { valid: false, error: 'Discount code is not applicable to this procedure' }
      }
    }

    // Check minimum purchase amount
    if (purchaseAmount !== undefined && purchaseAmount < discount.min_purchase_amount) {
      return { valid: false, error: `Minimum purchase of $${discount.min_purchase_amount.toFixed(2)} required` }
    }

    return { valid: true, discount }
  }

  async incrementUsage(tenantId: string, code: string): Promise<void> {
    await this.db.raw(
      `UPDATE discount_codes SET usage_count = usage_count + 1, updated_at = ? WHERE tenant_id = ? AND code = ?`,
      [Date.now(), tenantId, code.toUpperCase()]
    )
  }
}
