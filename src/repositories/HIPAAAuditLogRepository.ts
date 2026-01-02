/**
 * HIPAAAuditLogRepository - D1 Implementation
 * Immutable audit trail for HIPAA compliance
 */

import type { D1Database } from '../types/env'
import type {
  HIPAAAuditLogRepository,
  CreateHIPAAAuditLogInput,
  ListHIPAAAuditLogsParams,
  DateRangeParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { HIPAAAuditLog } from '../types/entities'
import * as ID from '../utils/id'

export class D1HIPAAAuditLogRepository implements HIPAAAuditLogRepository {
  constructor(private db: D1Database) {}

  /**
   * Create audit log entry
   * Note: This is append-only. No updates or deletes allowed (HIPAA requirement)
   */
  async create(data: CreateHIPAAAuditLogInput): Promise<HIPAAAuditLog> {
    const now = Date.now()
    const id = ID.generateHIPAAAuditLogId()

    const auditLog: HIPAAAuditLog = {
      id,
      user_id: data.user_id,
      user_email: data.user_email,
      user_name: data.user_name,
      tenant_id: data.tenant_id,
      location_name: data.location_name,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id || null,
      resource_summary: data.resource_summary || null,
      request_method: data.request_method,
      request_path: data.request_path,
      request_query: data.request_query || null,
      request_body_hash: data.request_body_hash || null,
      ip_address: data.ip_address,
      user_agent: data.user_agent || null,
      status_code: data.status_code,
      duration_ms: data.duration_ms,
      phi_accessed: data.phi_accessed || false,
      timestamp: now
    }

    await this.db
      .prepare(`
        INSERT INTO hipaa_audit_log (
          id, user_id, user_email, user_name, tenant_id, location_name,
          action, resource_type, resource_id, resource_summary,
          request_method, request_path, request_query, request_body_hash,
          ip_address, user_agent, status_code, duration_ms, phi_accessed, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        auditLog.user_id,
        auditLog.user_email,
        auditLog.user_name,
        auditLog.tenant_id,
        auditLog.location_name,
        auditLog.action,
        auditLog.resource_type,
        auditLog.resource_id,
        auditLog.resource_summary,
        auditLog.request_method,
        auditLog.request_path,
        auditLog.request_query,
        auditLog.request_body_hash,
        auditLog.ip_address,
        auditLog.user_agent,
        auditLog.status_code,
        auditLog.duration_ms,
        auditLog.phi_accessed ? 1 : 0,
        auditLog.timestamp
      )
      .run()

    return auditLog
  }

  async list(params: ListHIPAAAuditLogsParams): Promise<PaginatedResult<HIPAAAuditLog>> {
    const { tenant_id, limit = 100, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.user_id) {
      where.push('user_id = ?')
      values.push(params.user_id)
    }
    if (params.action) {
      where.push('action = ?')
      values.push(params.action)
    }
    if (params.resource_type) {
      where.push('resource_type = ?')
      values.push(params.resource_type)
    }
    if (params.resource_id) {
      where.push('resource_id = ?')
      values.push(params.resource_id)
    }
    if (params.phi_accessed !== undefined) {
      where.push('phi_accessed = ?')
      values.push(params.phi_accessed ? 1 : 0)
    }
    if (params.start_date) {
      where.push('timestamp >= ?')
      values.push(params.start_date)
    }
    if (params.end_date) {
      where.push('timestamp <= ?')
      values.push(params.end_date)
    }

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM hipaa_audit_log WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM hipaa_audit_log
        WHERE ${where.join(' AND ')}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, limit, offset)
      .all()

    const data = rows.results ? rows.results.map(row => this.mapRow(row)) : []

    return {
      data,
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  }

  async findByUser(userId: string, params: DateRangeParams): Promise<HIPAAAuditLog[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM hipaa_audit_log
        WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
      `)
      .bind(userId, params.start_date, params.end_date)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByResource(resourceType: string, resourceId: string): Promise<HIPAAAuditLog[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM hipaa_audit_log
        WHERE resource_type = ? AND resource_id = ?
        ORDER BY timestamp DESC
      `)
      .bind(resourceType, resourceId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async exportForCompliance(tenantId: string, params: DateRangeParams): Promise<HIPAAAuditLog[]> {
    // Export all audit logs for a tenant within date range
    // Used for HIPAA compliance audits
    const rows = await this.db
      .prepare(`
        SELECT * FROM hipaa_audit_log
        WHERE tenant_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `)
      .bind(tenantId, params.start_date, params.end_date)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): HIPAAAuditLog {
    return {
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      tenant_id: row.tenant_id,
      location_name: row.location_name,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      resource_summary: row.resource_summary,
      request_method: row.request_method,
      request_path: row.request_path,
      request_query: row.request_query,
      request_body_hash: row.request_body_hash,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      phi_accessed: row.phi_accessed === 1,
      timestamp: row.timestamp
    }
  }
}
