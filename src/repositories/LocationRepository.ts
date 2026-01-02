/**
 * LocationRepository - D1 Implementation
 * Handles multi-location (tenant) management
 */

import type { D1Database } from '../types/env'
import type {
  LocationRepository,
  CreateLocationInput,
  UpdateLocationInput
} from '../gateway/DatabaseGateway'
import type { Location } from '../types/entities'
import * as ID from '../utils/id'

export class D1LocationRepository implements LocationRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateLocationInput): Promise<Location> {
    const now = Date.now()
    const id = ID.generateLocationId()

    const location: Location = {
      id,
      name: data.name,
      code: data.code,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postcode: data.postcode || null,
      country: data.country || 'AU',
      timezone: data.timezone || 'Australia/Sydney',
      phone: data.phone || null,
      email: data.email || null,
      settings: data.settings || {},
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO locations (
          id, name, code, address, city, state, postcode, country, timezone,
          phone, email, settings, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        location.name,
        location.code,
        location.address,
        location.city,
        location.state,
        location.postcode,
        location.country,
        location.timezone,
        location.phone,
        location.email,
        JSON.stringify(location.settings),
        location.is_active ? 1 : 0,
        location.created_at,
        location.updated_at
      )
      .run()

    return location
  }

  async update(id: string, data: UpdateLocationInput): Promise<Location> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Location not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.code !== undefined) {
      updates.push('code = ?')
      values.push(data.code)
    }
    if (data.address !== undefined) {
      updates.push('address = ?')
      values.push(data.address)
    }
    if (data.city !== undefined) {
      updates.push('city = ?')
      values.push(data.city)
    }
    if (data.state !== undefined) {
      updates.push('state = ?')
      values.push(data.state)
    }
    if (data.postcode !== undefined) {
      updates.push('postcode = ?')
      values.push(data.postcode)
    }
    if (data.country !== undefined) {
      updates.push('country = ?')
      values.push(data.country)
    }
    if (data.timezone !== undefined) {
      updates.push('timezone = ?')
      values.push(data.timezone)
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?')
      values.push(data.phone)
    }
    if (data.email !== undefined) {
      updates.push('email = ?')
      values.push(data.email)
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?')
      values.push(JSON.stringify(data.settings))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as Location
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM locations WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<Location | null> {
    const row = await this.db
      .prepare('SELECT * FROM locations WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async findByCode(code: string): Promise<Location | null> {
    const row = await this.db
      .prepare('SELECT * FROM locations WHERE code = ?')
      .bind(code)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(): Promise<Location[]> {
    const rows = await this.db
      .prepare('SELECT * FROM locations ORDER BY name ASC')
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async listActive(): Promise<Location[]> {
    const rows = await this.db
      .prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY name ASC')
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): Location {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      city: row.city,
      state: row.state,
      postcode: row.postcode,
      country: row.country,
      timezone: row.timezone,
      phone: row.phone,
      email: row.email,
      settings: row.settings ? JSON.parse(row.settings) : {},
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
