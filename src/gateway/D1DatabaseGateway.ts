/**
 * D1DatabaseGateway - Cloudflare D1 Implementation
 *
 * This is the D1 (SQLite) implementation of DatabaseGateway interface.
 *
 * Migration Note:
 * When migrating to OneOS, create OneOSDatabaseGateway with same interface.
 * Services won't need to change - they only depend on the interface.
 */

import type { D1Database } from '../types/env'
import type {
  DatabaseGateway,
  ContactRepository,
  BookingRepository,
  TaskRepository,
  TouchpointRepository,
  SMSMessageRepository,
  StaffUserRepository,
  LocationRepository,
  PermissionRepository,
  IPWhitelistRepository,
  EmailCampaignRepository,
  EmailTemplateRepository,
  AutomationRuleRepository,
  SMSTemplateRepository,
  EventLogRepository,
  HIPAAAuditLogRepository,
  AIUsageLogRepository,
  SavedReportRepository,
  CreateContactInput,
  UpdateContactInput,
  ListContactsParams,
  PaginatedResult
} from './DatabaseGateway'

import type { Contact } from '../types/entities'
import * as ID from '../utils/id'

/**
 * D1DatabaseGateway Implementation
 */
export class D1DatabaseGateway implements DatabaseGateway {
  constructor(private db: D1Database) {}

  // Repository instances (lazy-loaded)
  private _contacts?: D1ContactRepository
  private _bookings?: D1BookingRepository
  private _tasks?: D1TaskRepository
  private _touchpoints?: D1TouchpointRepository
  private _smsMessages?: D1SMSMessageRepository
  private _staffUsers?: D1StaffUserRepository
  private _locations?: D1LocationRepository
  private _permissions?: D1PermissionRepository
  private _ipWhitelist?: D1IPWhitelistRepository
  private _emailCampaigns?: D1EmailCampaignRepository
  private _emailTemplates?: D1EmailTemplateRepository
  private _automationRules?: D1AutomationRuleRepository
  private _smsTemplates?: D1SMSTemplateRepository
  private _eventLog?: D1EventLogRepository
  private _hipaaAuditLog?: D1HIPAAAuditLogRepository
  private _aiUsageLog?: D1AIUsageLogRepository
  private _savedReports?: D1SavedReportRepository

  get contacts(): ContactRepository {
    if (!this._contacts) {
      this._contacts = new D1ContactRepository(this.db)
    }
    return this._contacts
  }

  get bookings(): BookingRepository {
    if (!this._bookings) {
      this._bookings = new D1BookingRepository(this.db)
    }
    return this._bookings
  }

  get tasks(): TaskRepository {
    if (!this._tasks) {
      this._tasks = new D1TaskRepository(this.db)
    }
    return this._tasks
  }

  get touchpoints(): TouchpointRepository {
    if (!this._touchpoints) {
      this._touchpoints = new D1TouchpointRepository(this.db)
    }
    return this._touchpoints
  }

  get smsMessages(): SMSMessageRepository {
    if (!this._smsMessages) {
      this._smsMessages = new D1SMSMessageRepository(this.db)
    }
    return this._smsMessages
  }

  get staffUsers(): StaffUserRepository {
    if (!this._staffUsers) {
      this._staffUsers = new D1StaffUserRepository(this.db)
    }
    return this._staffUsers
  }

  get locations(): LocationRepository {
    if (!this._locations) {
      this._locations = new D1LocationRepository(this.db)
    }
    return this._locations
  }

  get permissions(): PermissionRepository {
    if (!this._permissions) {
      this._permissions = new D1PermissionRepository(this.db)
    }
    return this._permissions
  }

  get ipWhitelist(): IPWhitelistRepository {
    if (!this._ipWhitelist) {
      this._ipWhitelist = new D1IPWhitelistRepository(this.db)
    }
    return this._ipWhitelist
  }

  get emailCampaigns(): EmailCampaignRepository {
    if (!this._emailCampaigns) {
      this._emailCampaigns = new D1EmailCampaignRepository(this.db)
    }
    return this._emailCampaigns
  }

  get emailTemplates(): EmailTemplateRepository {
    if (!this._emailTemplates) {
      this._emailTemplates = new D1EmailTemplateRepository(this.db)
    }
    return this._emailTemplates
  }

  get automationRules(): AutomationRuleRepository {
    if (!this._automationRules) {
      this._automationRules = new D1AutomationRuleRepository(this.db)
    }
    return this._automationRules
  }

  get smsTemplates(): SMSTemplateRepository {
    if (!this._smsTemplates) {
      this._smsTemplates = new D1SMSTemplateRepository(this.db)
    }
    return this._smsTemplates
  }

  get eventLog(): EventLogRepository {
    if (!this._eventLog) {
      this._eventLog = new D1EventLogRepository(this.db)
    }
    return this._eventLog
  }

  get hipaaAuditLog(): HIPAAAuditLogRepository {
    if (!this._hipaaAuditLog) {
      this._hipaaAuditLog = new D1HIPAAAuditLogRepository(this.db)
    }
    return this._hipaaAuditLog
  }

  get aiUsageLog(): AIUsageLogRepository {
    if (!this._aiUsageLog) {
      this._aiUsageLog = new D1AIUsageLogRepository(this.db)
    }
    return this._aiUsageLog
  }

  get savedReports(): SavedReportRepository {
    if (!this._savedReports) {
      this._savedReports = new D1SavedReportRepository(this.db)
    }
    return this._savedReports
  }

  async transaction<T>(callback: (tx: DatabaseGateway) => Promise<T>): Promise<T> {
    // D1 doesn't support nested transactions yet
    // For now, just execute the callback with the same gateway
    // TODO: Implement proper transaction support when D1 adds it
    return await callback(this)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.db.prepare('SELECT 1 as health').first<{ health: number }>()
      return result?.health === 1
    } catch {
      return false
    }
  }
}

// =====================================================================
// CONTACT REPOSITORY (D1 Implementation)
// =====================================================================

class D1ContactRepository implements ContactRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateContactInput): Promise<Contact> {
    const now = Date.now()
    const id = ID.generateContactId()

    const contact: Contact = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      source: data.source,
      current_pipeline: data.current_pipeline as any,
      current_stage: data.current_stage,
      warmness_score: 0,
      warmness_reasoning: null,
      warmness_updated_at: null,
      is_existing_patient: data.is_existing_patient || false,
      data: data.data || {},
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO contacts (
          id, name, phone, email, source, current_pipeline, current_stage,
          warmness_score, is_existing_patient, data, tenant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        contact.name,
        contact.phone,
        contact.email,
        contact.source,
        contact.current_pipeline,
        contact.current_stage,
        contact.warmness_score,
        contact.is_existing_patient ? 1 : 0,
        JSON.stringify(contact.data),
        data.tenant_id,
        contact.created_at,
        contact.updated_at
      )
      .run()

    return contact
  }

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Contact not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?')
      values.push(data.phone)
    }
    if (data.email !== undefined) {
      updates.push('email = ?')
      values.push(data.email)
    }
    if (data.current_pipeline !== undefined) {
      updates.push('current_pipeline = ?')
      values.push(data.current_pipeline)
    }
    if (data.current_stage !== undefined) {
      updates.push('current_stage = ?')
      values.push(data.current_stage)
    }
    if (data.is_existing_patient !== undefined) {
      updates.push('is_existing_patient = ?')
      values.push(data.is_existing_patient ? 1 : 0)
    }
    if (data.data !== undefined) {
      updates.push('data = ?')
      values.push(JSON.stringify(data.data))
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return await this.get(id) as Contact
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(params: ListContactsParams): Promise<PaginatedResult<Contact>> {
    const { tenant_id, limit = 50, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.pipeline) {
      where.push('current_pipeline = ?')
      values.push(params.pipeline)
    }
    if (params.stage) {
      where.push('current_stage = ?')
      values.push(params.stage)
    }
    if (params.warmness_min !== undefined) {
      where.push('warmness_score >= ?')
      values.push(params.warmness_min)
    }
    if (params.warmness_max !== undefined) {
      where.push('warmness_score <= ?')
      values.push(params.warmness_max)
    }
    if (params.source) {
      where.push('source = ?')
      values.push(params.source)
    }

    const orderBy = params.order_by || 'created_at'
    const orderDir = params.order_dir || 'desc'

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM contacts WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM contacts
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy} ${orderDir}
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

  async findByPhone(phone: string, tenantId: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE phone = ? AND tenant_id = ?')
      .bind(phone, tenantId)
      .first()

    return row ? this.mapRow(row) : null
  }

  async findByEmail(email: string, tenantId: string): Promise<Contact | null> {
    const row = await this.db
      .prepare('SELECT * FROM contacts WHERE email = ? AND tenant_id = ?')
      .bind(email, tenantId)
      .first()

    return row ? this.mapRow(row) : null
  }

  async updateWarmness(id: string, score: number, reasoning?: string): Promise<void> {
    const now = Date.now()
    await this.db
      .prepare(`
        UPDATE contacts
        SET warmness_score = ?, warmness_reasoning = ?, warmness_updated_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(score, reasoning || null, now, now, id)
      .run()
  }

  async search(query: string, tenantId: string): Promise<Contact[]> {
    const searchTerm = `%${query}%`
    const rows = await this.db
      .prepare(`
        SELECT * FROM contacts
        WHERE tenant_id = ?
        AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
        ORDER BY warmness_score DESC
        LIMIT 20
      `)
      .bind(tenantId, searchTerm, searchTerm, searchTerm)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  private mapRow(row: any): Contact {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      source: row.source,
      current_pipeline: row.current_pipeline,
      current_stage: row.current_stage,
      warmness_score: row.warmness_score,
      warmness_reasoning: row.warmness_reasoning,
      warmness_updated_at: row.warmness_updated_at,
      is_existing_patient: row.is_existing_patient === 1,
      data: row.data ? JSON.parse(row.data) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}

// =====================================================================
// PLACEHOLDER REPOSITORIES (To be implemented)
// =====================================================================

class D1BookingRepository implements BookingRepository {
  constructor(private db: D1Database) {}
  // TODO: Implement all methods
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async findByContact(contactId: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByDateRange(tenantId: string, startDate: number, endDate: number): Promise<any[]> { throw new Error('Not implemented') }
  async updateStatus(id: string, status: string): Promise<void> { throw new Error('Not implemented') }
  async assignStaff(id: string, staffId: string): Promise<void> { throw new Error('Not implemented') }
}

class D1TaskRepository implements TaskRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async findByContact(contactId: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByAssignee(assigneeId: string, tenantId: string): Promise<any[]> { throw new Error('Not implemented') }
  async updateStatus(id: string, status: string): Promise<void> { throw new Error('Not implemented') }
  async complete(id: string): Promise<void> { throw new Error('Not implemented') }
}

class D1TouchpointRepository implements TouchpointRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async list(contactId: string): Promise<any[]> { throw new Error('Not implemented') }
  async listRecent(tenantId: string, limit: number): Promise<any[]> { throw new Error('Not implemented') }
}

class D1SMSMessageRepository implements SMSMessageRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async findByContact(contactId: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByProviderMessageId(providerMessageId: string): Promise<any> { throw new Error('Not implemented') }
  async updateStatus(id: string, status: string, deliveredAt?: number): Promise<void> { throw new Error('Not implemented') }
}

class D1StaffUserRepository implements StaffUserRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async findByEmail(email: string): Promise<any> { throw new Error('Not implemented') }
  async findByGoogleId(googleId: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId?: string): Promise<any[]> { throw new Error('Not implemented') }
  async updateLastLogin(id: string): Promise<void> { throw new Error('Not implemented') }
}

class D1LocationRepository implements LocationRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async findByCode(code: string): Promise<any> { throw new Error('Not implemented') }
  async list(): Promise<any[]> { throw new Error('Not implemented') }
  async listActive(): Promise<any[]> { throw new Error('Not implemented') }
}

class D1PermissionRepository implements PermissionRepository {
  constructor(private db: D1Database) {}
  async check(params: any): Promise<boolean> { throw new Error('Not implemented') }
  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> { throw new Error('Not implemented') }
  async getRolePermissions(role: string): Promise<any[]> { throw new Error('Not implemented') }
  async createUserPermission(data: any): Promise<any> { throw new Error('Not implemented') }
  async updateUserPermission(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async deleteUserPermission(id: string): Promise<void> { throw new Error('Not implemented') }
  async listUserPermissions(userId: string): Promise<any[]> { throw new Error('Not implemented') }
}

class D1IPWhitelistRepository implements IPWhitelistRepository {
  constructor(private db: D1Database) {}
  async isAllowed(ip: string, tenantId: string): Promise<boolean> { throw new Error('Not implemented') }
  async add(data: any): Promise<any> { throw new Error('Not implemented') }
  async remove(id: string): Promise<void> { throw new Error('Not implemented') }
  async list(tenantId: string): Promise<any[]> { throw new Error('Not implemented') }
  async listAll(): Promise<any[]> { throw new Error('Not implemented') }
}

class D1EmailCampaignRepository implements EmailCampaignRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByStatus(tenantId: string, status: string): Promise<any[]> { throw new Error('Not implemented') }
  async updateAnalytics(id: string, analytics: any): Promise<void> { throw new Error('Not implemented') }
}

class D1EmailTemplateRepository implements EmailTemplateRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId?: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByCategory(category: string, tenantId?: string): Promise<any[]> { throw new Error('Not implemented') }
}

class D1AutomationRuleRepository implements AutomationRuleRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId?: string): Promise<any[]> { throw new Error('Not implemented') }
  async findActive(pipeline?: string, stage?: string): Promise<any[]> { throw new Error('Not implemented') }
}

class D1SMSTemplateRepository implements SMSTemplateRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId?: string): Promise<any[]> { throw new Error('Not implemented') }
  async findByCategory(category: string): Promise<any[]> { throw new Error('Not implemented') }
  async incrementUsage(id: string): Promise<void> { throw new Error('Not implemented') }
}

class D1EventLogRepository implements EventLogRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async findByEntity(entityType: string, entityId: string): Promise<any[]> { throw new Error('Not implemented') }
}

class D1HIPAAAuditLogRepository implements HIPAAAuditLogRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async findByUser(userId: string, params: any): Promise<any[]> { throw new Error('Not implemented') }
  async findByResource(resourceType: string, resourceId: string): Promise<any[]> { throw new Error('Not implemented') }
  async exportForCompliance(tenantId: string, params: any): Promise<any[]> { throw new Error('Not implemented') }
}

class D1AIUsageLogRepository implements AIUsageLogRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async list(params: any): Promise<any> { throw new Error('Not implemented') }
  async getUsageByTenant(tenantId: string, params: any): Promise<any> { throw new Error('Not implemented') }
  async getUsageByModel(model: string, params: any): Promise<any> { throw new Error('Not implemented') }
  async getTotalCost(tenantId: string, params: any): Promise<number> { throw new Error('Not implemented') }
}

class D1SavedReportRepository implements SavedReportRepository {
  constructor(private db: D1Database) {}
  async create(data: any): Promise<any> { throw new Error('Not implemented') }
  async update(id: string, data: any): Promise<any> { throw new Error('Not implemented') }
  async delete(id: string): Promise<void> { throw new Error('Not implemented') }
  async get(id: string): Promise<any> { throw new Error('Not implemented') }
  async list(tenantId: string): Promise<any[]> { throw new Error('Not implemented') }
  async findScheduled(now: number): Promise<any[]> { throw new Error('Not implemented') }
}
