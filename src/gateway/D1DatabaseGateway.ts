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
import type { DatabaseGateway } from './DatabaseGateway'

// Import all repository implementations
import { D1ContactRepository } from '../repositories/ContactRepository'
import { D1BookingRepository } from '../repositories/BookingRepository'
import { D1TaskRepository } from '../repositories/TaskRepository'
import { D1TouchpointRepository } from '../repositories/TouchpointRepository'
import { D1SMSMessageRepository } from '../repositories/SMSMessageRepository'
import { D1StaffUserRepository } from '../repositories/StaffUserRepository'
import { D1LocationRepository } from '../repositories/LocationRepository'
import { D1PermissionRepository } from '../repositories/PermissionRepository'
import { D1IPWhitelistRepository } from '../repositories/IPWhitelistRepository'
import { D1EmailCampaignRepository } from '../repositories/EmailCampaignRepository'
import { D1EmailTemplateRepository } from '../repositories/EmailTemplateRepository'
import { D1AutomationRuleRepository } from '../repositories/AutomationRuleRepository'
import { D1SMSTemplateRepository } from '../repositories/SMSTemplateRepository'
import { D1EventLogRepository } from '../repositories/EventLogRepository'
import { D1HIPAAAuditLogRepository } from '../repositories/HIPAAAuditLogRepository'
import { D1AIUsageLogRepository } from '../repositories/AIUsageLogRepository'
import { D1SavedReportRepository } from '../repositories/SavedReportRepository'

/**
 * D1DatabaseGateway Implementation
 * Complete implementation with all 17 repositories
 */
export class D1DatabaseGateway implements DatabaseGateway {
  constructor(private db: D1Database) {}

  // Repository instances (lazy-loaded for performance)
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

  // Core repositories
  get contacts() {
    if (!this._contacts) {
      this._contacts = new D1ContactRepository(this.db)
    }
    return this._contacts
  }

  get bookings() {
    if (!this._bookings) {
      this._bookings = new D1BookingRepository(this.db)
    }
    return this._bookings
  }

  get tasks() {
    if (!this._tasks) {
      this._tasks = new D1TaskRepository(this.db)
    }
    return this._tasks
  }

  get touchpoints() {
    if (!this._touchpoints) {
      this._touchpoints = new D1TouchpointRepository(this.db)
    }
    return this._touchpoints
  }

  get smsMessages() {
    if (!this._smsMessages) {
      this._smsMessages = new D1SMSMessageRepository(this.db)
    }
    return this._smsMessages
  }

  get staffUsers() {
    if (!this._staffUsers) {
      this._staffUsers = new D1StaffUserRepository(this.db)
    }
    return this._staffUsers
  }

  // Multi-location & security
  get locations() {
    if (!this._locations) {
      this._locations = new D1LocationRepository(this.db)
    }
    return this._locations
  }

  get permissions() {
    if (!this._permissions) {
      this._permissions = new D1PermissionRepository(this.db)
    }
    return this._permissions
  }

  get ipWhitelist() {
    if (!this._ipWhitelist) {
      this._ipWhitelist = new D1IPWhitelistRepository(this.db)
    }
    return this._ipWhitelist
  }

  // Email marketing
  get emailCampaigns() {
    if (!this._emailCampaigns) {
      this._emailCampaigns = new D1EmailCampaignRepository(this.db)
    }
    return this._emailCampaigns
  }

  get emailTemplates() {
    if (!this._emailTemplates) {
      this._emailTemplates = new D1EmailTemplateRepository(this.db)
    }
    return this._emailTemplates
  }

  // Automation
  get automationRules() {
    if (!this._automationRules) {
      this._automationRules = new D1AutomationRuleRepository(this.db)
    }
    return this._automationRules
  }

  get smsTemplates() {
    if (!this._smsTemplates) {
      this._smsTemplates = new D1SMSTemplateRepository(this.db)
    }
    return this._smsTemplates
  }

  // Logging & audit
  get eventLog() {
    if (!this._eventLog) {
      this._eventLog = new D1EventLogRepository(this.db)
    }
    return this._eventLog
  }

  get hipaaAuditLog() {
    if (!this._hipaaAuditLog) {
      this._hipaaAuditLog = new D1HIPAAAuditLogRepository(this.db)
    }
    return this._hipaaAuditLog
  }

  get aiUsageLog() {
    if (!this._aiUsageLog) {
      this._aiUsageLog = new D1AIUsageLogRepository(this.db)
    }
    return this._aiUsageLog
  }

  // Reporting
  get savedReports() {
    if (!this._savedReports) {
      this._savedReports = new D1SavedReportRepository(this.db)
    }
    return this._savedReports
  }

  // Transaction support
  async transaction<T>(callback: (tx: DatabaseGateway) => Promise<T>): Promise<T> {
    // D1 doesn't support nested transactions yet
    // For now, just execute the callback with the same gateway
    // TODO: Implement proper transaction support when D1 adds it
    return await callback(this)
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.db.prepare('SELECT 1 as health').first<{ health: number }>()
      return result?.health === 1
    } catch {
      return false
    }
  }

  // Raw SQL queries
  async raw<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      let stmt = this.db.prepare(query)
      
      if (params && params.length > 0) {
        stmt = stmt.bind(...params)
      }
      
      const result = await stmt.all<T>()
      return result.results || []
    } catch (error) {
      console.error('Raw query error:', error, 'Query:', query, 'Params:', params)
      throw error
    }
  }
}
