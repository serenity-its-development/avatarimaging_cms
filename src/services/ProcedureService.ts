/**
 * ProcedureService - Manage medical procedures/services with pricing
 */

import type { D1DatabaseGateway } from '../gateway/D1DatabaseGateway'
import { ulid } from 'ulid'

export interface Procedure {
  id: string
  tenant_id: string
  name: string
  description?: string
  duration_minutes: number
  base_price: number
  category?: string
  is_active: boolean
  requires_deposit: boolean
  deposit_amount: number
  metadata?: Record<string, any>
  created_at: number
  updated_at: number
}

export interface CreateProcedureInput {
  tenant_id: string
  name: string
  description?: string
  duration_minutes: number
  base_price: number
  category?: string
  requires_deposit?: boolean
  deposit_amount?: number
  metadata?: Record<string, any>
}

export interface UpdateProcedureInput {
  name?: string
  description?: string
  duration_minutes?: number
  base_price?: number
  category?: string
  is_active?: boolean
  requires_deposit?: boolean
  deposit_amount?: number
  metadata?: Record<string, any>
}

export class ProcedureService {
  constructor(private db: D1DatabaseGateway) {}

  private parseProcedure(row: any): Procedure {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      duration_minutes: row.duration_minutes,
      base_price: row.base_price,
      category: row.category,
      is_active: row.is_active === 1,
      requires_deposit: row.requires_deposit === 1,
      deposit_amount: row.deposit_amount || 0,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }

  async list(tenantId: string, activeOnly: boolean = true): Promise<Procedure[]> {
    const query = activeOnly
      ? `SELECT * FROM procedures WHERE tenant_id = ? AND is_active = 1 ORDER BY category, name`
      : `SELECT * FROM procedures WHERE tenant_id = ? ORDER BY category, name`

    const result = await this.db.raw(query, [tenantId])
    const rows = result.results || []
    return rows.map(row => this.parseProcedure(row))
  }

  async getById(tenantId: string, procedureId: string): Promise<Procedure | null> {
    const result = await this.db.raw(
      `SELECT * FROM procedures WHERE tenant_id = ? AND id = ?`,
      [tenantId, procedureId]
    )

    const rows = result.results || []
    return rows.length > 0 ? this.parseProcedure(rows[0]) : null
  }

  async create(input: CreateProcedureInput): Promise<Procedure> {
    const id = `proc_${ulid()}`
    const now = Date.now()

    await this.db.raw(
      `INSERT INTO procedures (
        id, tenant_id, name, description, duration_minutes, base_price, category,
        is_active, requires_deposit, deposit_amount, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        id,
        input.tenant_id,
        input.name,
        input.description || null,
        input.duration_minutes,
        input.base_price,
        input.category || null,
        input.requires_deposit ? 1 : 0,
        input.deposit_amount || 0,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now,
        now
      ]
    )

    const procedure = await this.getById(input.tenant_id, id)
    if (!procedure) {
      throw new Error('Failed to create procedure')
    }

    return procedure
  }

  async update(tenantId: string, procedureId: string, input: UpdateProcedureInput): Promise<Procedure> {
    const updates: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      values.push(input.name)
    }
    if (input.description !== undefined) {
      updates.push('description = ?')
      values.push(input.description)
    }
    if (input.duration_minutes !== undefined) {
      updates.push('duration_minutes = ?')
      values.push(input.duration_minutes)
    }
    if (input.base_price !== undefined) {
      updates.push('base_price = ?')
      values.push(input.base_price)
    }
    if (input.category !== undefined) {
      updates.push('category = ?')
      values.push(input.category)
    }
    if (input.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(input.is_active ? 1 : 0)
    }
    if (input.requires_deposit !== undefined) {
      updates.push('requires_deposit = ?')
      values.push(input.requires_deposit ? 1 : 0)
    }
    if (input.deposit_amount !== undefined) {
      updates.push('deposit_amount = ?')
      values.push(input.deposit_amount)
    }
    if (input.metadata !== undefined) {
      updates.push('metadata = ?')
      values.push(JSON.stringify(input.metadata))
    }

    updates.push('updated_at = ?')
    values.push(Date.now())

    values.push(tenantId, procedureId)

    await this.db.raw(
      `UPDATE procedures SET ${updates.join(', ')} WHERE tenant_id = ? AND id = ?`,
      values
    )

    const procedure = await this.getById(tenantId, procedureId)
    if (!procedure) {
      throw new Error('Procedure not found')
    }

    return procedure
  }

  async delete(tenantId: string, procedureId: string): Promise<void> {
    // Soft delete - mark as inactive
    await this.db.raw(
      `UPDATE procedures SET is_active = 0, updated_at = ? WHERE tenant_id = ? AND id = ?`,
      [Date.now(), tenantId, procedureId]
    )
  }

  async calculatePrice(
    procedureId: string,
    discountCode?: string,
    tenantId: string = 'default'
  ): Promise<{ basePrice: number; discountAmount: number; finalPrice: number; discountDetails?: any }> {
    const procedure = await this.getById(tenantId, procedureId)
    if (!procedure) {
      throw new Error('Procedure not found')
    }

    const basePrice = procedure.base_price
    let discountAmount = 0
    let discountDetails = null

    if (discountCode) {
      // Get discount code details from DiscountCodeService
      const result = await this.db.raw(
        `SELECT * FROM discount_codes WHERE tenant_id = ? AND code = ? AND is_active = 1`,
        [tenantId, discountCode]
      )

      const rows = result.results || []
      if (rows.length > 0) {
        const discount = rows[0]

        // Check if discount is valid
        const now = Date.now()
        const validFrom = discount.valid_from
        const validUntil = discount.valid_until

        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          // Check usage limits
          if (!discount.usage_limit || discount.usage_count < discount.usage_limit) {
            // Check minimum purchase
            if (basePrice >= (discount.min_purchase_amount || 0)) {
              // Calculate discount
              if (discount.discount_type === 'percentage') {
                discountAmount = (basePrice * discount.discount_value) / 100
                if (discount.max_discount_amount) {
                  discountAmount = Math.min(discountAmount, discount.max_discount_amount)
                }
              } else if (discount.discount_type === 'fixed_amount') {
                discountAmount = Math.min(discount.discount_value, basePrice)
              }

              discountDetails = {
                id: discount.id,
                code: discount.code,
                type: discount.discount_type,
                value: discount.discount_value,
                influencer_id: discount.influencer_id
              }
            }
          }
        }
      }
    }

    const finalPrice = Math.max(0, basePrice - discountAmount)

    return {
      basePrice,
      discountAmount,
      finalPrice,
      discountDetails
    }
  }
}
