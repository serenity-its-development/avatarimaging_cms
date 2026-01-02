/**
 * StaffUserRepository - D1 Implementation
 * Handles staff user management and authentication
 */

import type { D1Database } from '../types/env'
import type {
  StaffUserRepository,
  CreateStaffUserInput,
  UpdateStaffUserInput
} from '../gateway/DatabaseGateway'
import type { StaffUser } from '../types/entities'
import * as ID from '../utils/id'

export class D1StaffUserRepository implements StaffUserRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateStaffUserInput): Promise<StaffUser> {
    const now = Date.now()
    const id = ID.generateStaffUserId()

    const user: StaffUser = {
      id,
      email: data.email,
      name: data.name,
      google_id: data.google_id || null,
      role: (data.role || 'staff') as any,
      permissions: data.permissions || [],
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now,
      last_login_at: null
    }

    await this.db
      .prepare(`
        INSERT INTO staff_users (
          id, email, name, google_id, role, permissions, is_active,
          default_location_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        user.email,
        user.name,
        user.google_id,
        user.role,
        JSON.stringify(user.permissions),
        user.is_active ? 1 : 0,
        data.default_location_id || null,
        user.created_at,
        user.updated_at
      )
      .run()

    return user
  }

  async update(id: string, data: UpdateStaffUserInput): Promise<StaffUser> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Staff user not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.email !== undefined) {
      updates.push('email = ?')
      values.push(data.email)
    }
    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.role !== undefined) {
      updates.push('role = ?')
      values.push(data.role)
    }
    if (data.permissions !== undefined) {
      updates.push('permissions = ?')
      values.push(JSON.stringify(data.permissions))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }
    if (data.default_location_id !== undefined) {
      updates.push('default_location_id = ?')
      values.push(data.default_location_id)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE staff_users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as StaffUser
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM staff_users WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<StaffUser | null> {
    const row = await this.db
      .prepare('SELECT * FROM staff_users WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async findByEmail(email: string): Promise<StaffUser | null> {
    const row = await this.db
      .prepare('SELECT * FROM staff_users WHERE email = ?')
      .bind(email)
      .first()

    return row ? this.mapRow(row) : null
  }

  async findByGoogleId(googleId: string): Promise<StaffUser | null> {
    const row = await this.db
      .prepare('SELECT * FROM staff_users WHERE google_id = ?')
      .bind(googleId)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(tenantId?: string): Promise<StaffUser[]> {
    let query = 'SELECT * FROM staff_users'
    const values: any[] = []

    if (tenantId) {
      query += ' WHERE default_location_id = ?'
      values.push(tenantId)
    }

    query += ' ORDER BY name ASC'

    const rows = await this.db.prepare(query).bind(...values).all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async updateLastLogin(id: string): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare('UPDATE staff_users SET last_login_at = ? WHERE id = ?')
      .bind(now, id)
      .run()
  }

  private mapRow(row: any): StaffUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      google_id: row.google_id,
      role: row.role,
      permissions: row.permissions ? JSON.parse(row.permissions) : [],
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at
    }
  }
}
