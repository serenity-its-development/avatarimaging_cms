/**
 * TaskRepository - D1 Implementation
 */

import type { D1Database } from '../types/env'
import type {
  TaskRepository,
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksParams,
  PaginatedResult
} from '../gateway/DatabaseGateway'
import type { Task } from '../types/entities'
import * as ID from '../utils/id'

export class D1TaskRepository implements TaskRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateTaskInput): Promise<Task> {
    const now = Date.now()
    const id = ID.generateTaskId()

    const task: Task = {
      id,
      contact_id: data.contact_id,
      booking_id: data.booking_id || null,
      title: data.title,
      description: data.description || null,
      task_type: data.task_type as any,
      priority: (data.priority || 'medium') as any,
      status: (data.status || 'pending') as any,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date || null,
      completed_at: null,
      context: data.context || {},
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO tasks (
          id, contact_id, booking_id, title, description, task_type, priority,
          status, assigned_to, due_date, context, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        task.contact_id,
        task.booking_id,
        task.title,
        task.description,
        task.task_type,
        task.priority,
        task.status,
        task.assigned_to,
        task.due_date,
        JSON.stringify(task.context),
        task.created_at,
        task.updated_at
      )
      .run()

    return task
  }

  async update(id: string, data: UpdateTaskInput): Promise<Task> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Task not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
      updates.push('title = ?')
      values.push(data.title)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.task_type !== undefined) {
      updates.push('task_type = ?')
      values.push(data.task_type)
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?')
      values.push(data.priority)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.assigned_to !== undefined) {
      updates.push('assigned_to = ?')
      values.push(data.assigned_to)
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?')
      values.push(data.due_date)
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?')
      values.push(data.completed_at)
    }
    if (data.context !== undefined) {
      updates.push('context = ?')
      values.push(JSON.stringify(data.context))
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return (await this.get(id)) as Task
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
  }

  async get(id: string): Promise<Task | null> {
    const row = await this.db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id)
      .first()

    return row ? this.mapRow(row) : null
  }

  async list(params: ListTasksParams): Promise<PaginatedResult<Task>> {
    const { tenant_id, limit = 50, offset = 0 } = params
    const where: string[] = ['tenant_id = ?']
    const values: any[] = [tenant_id]

    if (params.contact_id) {
      where.push('contact_id = ?')
      values.push(params.contact_id)
    }
    if (params.assigned_to) {
      where.push('assigned_to = ?')
      values.push(params.assigned_to)
    }
    if (params.status) {
      where.push('status = ?')
      values.push(params.status)
    }
    if (params.priority) {
      where.push('priority = ?')
      values.push(params.priority)
    }
    if (params.task_type) {
      where.push('task_type = ?')
      values.push(params.task_type)
    }
    if (params.due_before) {
      where.push('due_date <= ?')
      values.push(params.due_before)
    }

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${where.join(' AND ')}`)
      .bind(...values)
      .first<{ count: number }>()

    const total = countResult?.count || 0

    // Get data - order by priority (urgent > high > medium > low) then due_date
    const rows = await this.db
      .prepare(`
        SELECT * FROM tasks
        WHERE ${where.join(' AND ')}
        ORDER BY
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          due_date ASC NULLS LAST,
          created_at DESC
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

  async findByContact(contactId: string): Promise<Task[]> {
    const rows = await this.db
      .prepare('SELECT * FROM tasks WHERE contact_id = ? ORDER BY created_at DESC')
      .bind(contactId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async findByAssignee(assigneeId: string, tenantId: string): Promise<Task[]> {
    const rows = await this.db
      .prepare(`
        SELECT * FROM tasks
        WHERE assigned_to = ? AND tenant_id = ?
        ORDER BY
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          due_date ASC NULLS LAST
      `)
      .bind(assigneeId, tenantId)
      .all()

    return rows.results ? rows.results.map(row => this.mapRow(row)) : []
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const now = Date.now()
    const updates: any[] = [status, now]

    // If marking as completed, set completed_at
    let query = 'UPDATE tasks SET status = ?, updated_at = ?'
    if (status === 'completed') {
      query += ', completed_at = ?'
      updates.push(now)
    }
    query += ' WHERE id = ?'
    updates.push(id)

    await this.db.prepare(query).bind(...updates).run()
  }

  async complete(id: string): Promise<void> {
    await this.updateStatus(id, 'completed')
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      contact_id: row.contact_id,
      booking_id: row.booking_id,
      title: row.title,
      description: row.description,
      task_type: row.task_type,
      priority: row.priority,
      status: row.status,
      assigned_to: row.assigned_to,
      due_date: row.due_date,
      completed_at: row.completed_at,
      context: row.context ? JSON.parse(row.context) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
