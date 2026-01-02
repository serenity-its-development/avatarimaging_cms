/**
 * AIUsageLogRepository - D1 Implementation
 * Tracks AI model usage for cost optimization
 */

import type { D1Database } from '../types/env'
import type {
  AIUsageLogRepository,
  CreateAIUsageLogInput,
  ListAIUsageLogsParams,
  DateRangeParams,
  PaginatedResult,
  AIUsageStats
} from '../gateway/DatabaseGateway'
import type { AIUsageLog } from '../types/entities'
import * as ID from '../utils/id'

export class D1AIUsageLogRepository implements AIUsageLogRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateAIUsageLogInput): Promise<AIUsageLog> {
    const now = Date.now()
    const id = ID.generateAIUsageLogId()

    const log: AIUsageLog = {
      id,
      tenant_id: data.tenant_id,
      model: data.model,
      use_case: data.use_case,
      prompt_length: data.prompt_length,
      max_tokens: data.max_tokens,
      tokens_used: data.tokens_used,
      response_length: data.response_length,
      duration_ms: data.duration_ms,
      cost_usd: data.cost_usd,
      user_id: data.user_id || null,
      resource_type: data.resource_type || null,
      resource_id: data.resource_id || null,
      timestamp: now
    }

    await this.db
      .prepare(`
        INSERT INTO ai_usage_log (
          id, tenant_id, model, use_case, prompt_length, max_tokens,
          tokens_used, response_length, duration_ms, cost_usd,
          user_id, resource_type, resource_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        log.tenant_id,
        log.model,
        log.use_case,
        log.prompt_length,
        log.max_tokens,
        log.tokens_used,
        log.response_length,
        log.duration_ms,
        log.cost_usd,
        log.user_id,
        log.resource_type,
        log.resource_id,
        log.timestamp
      )
      .run()

    return log
  }

  async list(params: ListAIUsageLogsParams): Promise<PaginatedResult<AIUsageLog>> {
    const { tenant_id, limit = 100, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.model) {
      where.push('model = ?')
      values.push(params.model)
    }
    if (params.use_case) {
      where.push('use_case = ?')
      values.push(params.use_case)
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
      .prepare(`SELECT COUNT(*) as count FROM ai_usage_log WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data
    const rows = await this.db
      .prepare(`
        SELECT * FROM ai_usage_log
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

  async getUsageByTenant(tenantId: string, params: DateRangeParams): Promise<AIUsageStats> {
    const row = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total_calls,
          SUM(tokens_used) as total_tokens,
          SUM(cost_usd) as total_cost_usd,
          AVG(duration_ms) as avg_duration_ms
        FROM ai_usage_log
        WHERE tenant_id = ? AND timestamp >= ? AND timestamp <= ?
      `)
      .bind(tenantId, params.start_date, params.end_date)
      .first<{
        total_calls: number
        total_tokens: number
        total_cost_usd: number
        avg_duration_ms: number
      }>()

    return {
      total_calls: row?.total_calls || 0,
      total_tokens: row?.total_tokens || 0,
      total_cost_usd: row?.total_cost_usd || 0,
      avg_duration_ms: row?.avg_duration_ms || 0
    }
  }

  async getUsageByModel(model: string, params: DateRangeParams): Promise<AIUsageStats> {
    const row = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total_calls,
          SUM(tokens_used) as total_tokens,
          SUM(cost_usd) as total_cost_usd,
          AVG(duration_ms) as avg_duration_ms
        FROM ai_usage_log
        WHERE model = ? AND timestamp >= ? AND timestamp <= ?
      `)
      .bind(model, params.start_date, params.end_date)
      .first<{
        total_calls: number
        total_tokens: number
        total_cost_usd: number
        avg_duration_ms: number
      }>()

    return {
      total_calls: row?.total_calls || 0,
      total_tokens: row?.total_tokens || 0,
      total_cost_usd: row?.total_cost_usd || 0,
      avg_duration_ms: row?.avg_duration_ms || 0
    }
  }

  async getTotalCost(tenantId: string, params: DateRangeParams): Promise<number> {
    const row = await this.db
      .prepare(`
        SELECT SUM(cost_usd) as total_cost
        FROM ai_usage_log
        WHERE tenant_id = ? AND timestamp >= ? AND timestamp <= ?
      `)
      .bind(tenantId, params.start_date, params.end_date)
      .first<{ total_cost: number }>()

    return row?.total_cost || 0
  }

  private mapRow(row: any): AIUsageLog {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      model: row.model,
      use_case: row.use_case,
      prompt_length: row.prompt_length,
      max_tokens: row.max_tokens,
      tokens_used: row.tokens_used,
      response_length: row.response_length,
      duration_ms: row.duration_ms,
      cost_usd: row.cost_usd,
      user_id: row.user_id,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      timestamp: row.timestamp
    }
  }
}
