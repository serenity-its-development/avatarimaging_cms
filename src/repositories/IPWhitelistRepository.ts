/**
 * IPWhitelistRepository - D1 Implementation
 * Handles IPv4 and IPv6 whitelist for HIPAA compliance
 */

import type { D1Database } from '../types/env'
import type {
  IPWhitelistRepository,
  CreateIPWhitelistInput
} from '../gateway/DatabaseGateway'
import type { IPWhitelist } from '../types/entities'
import * as ID from '../utils/id'
import { isIPInCIDR, getIPVersion } from '../utils/ip'

export class D1IPWhitelistRepository implements IPWhitelistRepository {
  constructor(private db: D1Database) {}

  /**
   * Check if IP address is allowed
   * Checks both global whitelist and tenant-specific whitelist
   */
  async isAllowed(ip: string, tenantId: string): Promise<boolean> {
    // Get all active whitelist entries (global + tenant-specific)
    const rows = await this.db
      .prepare(`
        SELECT ip_address, ip_version
        FROM ip_whitelist
        WHERE is_active = 1
        AND (location_id IS NULL OR location_id = ?)
      `)
      .bind(tenantId)
      .all<{ ip_address: string; ip_version: number }>()

    if (!rows.results || rows.results.length === 0) {
      // No whitelist configured - default deny
      return false
    }

    // Check if IP matches any CIDR range
    for (const entry of rows.results) {
      if (isIPInCIDR(ip, entry.ip_address)) {
        return true
      }
    }

    return false
  }

  async add(data: CreateIPWhitelistInput): Promise<IPWhitelist> {
    const now = Date.now()
    const id = ID.generateIPWhitelistId()

    const ipWhitelist: IPWhitelist = {
      id,
      location_id: data.location_id || null,
      ip_address: data.ip_address,
      ip_version: data.ip_version,
      description: data.description || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      created_by: data.created_by,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO ip_whitelist (
          id, location_id, ip_address, ip_version, description,
          is_active, created_at, created_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        ipWhitelist.location_id,
        ipWhitelist.ip_address,
        ipWhitelist.ip_version,
        ipWhitelist.description,
        ipWhitelist.is_active ? 1 : 0,
        ipWhitelist.created_at,
        ipWhitelist.created_by,
        ipWhitelist.updated_at
      )
      .run()

    return ipWhitelist
  }

  async remove(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM ip_whitelist WHERE id = ?').bind(id).run()
  }

  async list(tenantId: string): Promise<IPWhitelist[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM ip_whitelist
        WHERE location_id = ?
        ORDER BY created_at DESC
      `)
      .bind(tenantId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async listAll(): Promise<IPWhitelist[]> {
    const rows = await this.db
      .prepare('SELECT * FROM ip_whitelist ORDER BY created_at DESC')
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): IPWhitelist {
    return {
      id: row.id,
      location_id: row.location_id,
      ip_address: row.ip_address,
      ip_version: row.ip_version,
      description: row.description,
      is_active: row.is_active === 1,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at
    }
  }
}
