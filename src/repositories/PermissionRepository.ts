/**
 * PermissionRepository - D1 Implementation
 * Handles RBAC (Role-Based Access Control)
 */

import type { D1Database } from '../types/env'
import type {
  PermissionRepository,
  CheckPermissionParams,
  CreateUserPermissionInput,
  UpdateUserPermissionInput
} from '../gateway/DatabaseGateway'
import type { Permission, UserPermission } from '../types/entities'
import * as ID from '../utils/id'

export class D1PermissionRepository implements PermissionRepository {
  constructor(private db: D1Database) {}

  /**
   * Check if user has permission
   * Logic:
   * 1. Get user's role at tenant (from user_permissions)
   * 2. Get role's permissions (from permissions table)
   * 3. Check custom permission overrides (from user_permissions.custom_permissions)
   * 4. Evaluate conditions (own_location_only, etc.)
   */
  async check(params: CheckPermissionParams): Promise<boolean> {
    const { user_id, tenant_id, permission } = params

    // Parse permission: "contacts:create" → resource="contacts", action="create"
    const [resource, action] = permission.split(':')

    // Get user's permissions at this location
    const userPerm = await this.db
      .prepare(`
        SELECT role, custom_permissions
        FROM user_permissions
        WHERE user_id = ? AND location_id = ? AND is_active = 1
      `)
      .bind(user_id, tenant_id)
      .first<{ role: string; custom_permissions: string }>()

    if (!userPerm) {
      // User has no permissions at this location
      return false
    }

    // Check custom permission overrides first
    if (userPerm.custom_permissions) {
      const customPerms = JSON.parse(userPerm.custom_permissions) as Array<{
        resource: string
        action: string
        allow: boolean
      }>

      const override = customPerms.find(
        p => p.resource === resource && p.action === action
      )

      if (override) {
        return override.allow
      }
    }

    // Check role permissions
    const rolePerm = await this.db
      .prepare(`
        SELECT * FROM permissions
        WHERE role = ? AND resource = ? AND (action = ? OR action = '*')
      `)
      .bind(userPerm.role, resource, action)
      .first()

    if (!rolePerm) {
      return false
    }

    // Evaluate conditions (if any)
    // For now, basic permission check. Conditions like "own_location_only"
    // should be evaluated in the service layer with additional context.
    return true
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    // Get user's role at this location
    const userPerm = await this.db
      .prepare(`
        SELECT role, custom_permissions
        FROM user_permissions
        WHERE user_id = ? AND location_id = ? AND is_active = 1
      `)
      .bind(userId, tenantId)
      .first<{ role: string; custom_permissions: string }>()

    if (!userPerm) {
      return []
    }

    // Get all permissions for this role
    const rolePerms = await this.db
      .prepare(`
        SELECT resource, action FROM permissions WHERE role = ?
      `)
      .bind(userPerm.role)
      .all<{ resource: string; action: string }>()

    const permissions: string[] = []

    // Build permission strings
    if (rolePerms.results) {
      for (const perm of rolePerms.results) {
        if (perm.action === '*') {
          // Wildcard - user has all actions on this resource
          permissions.push(`${perm.resource}:*`)
        } else {
          permissions.push(`${perm.resource}:${perm.action}`)
        }
      }
    }

    // Apply custom permission overrides
    if (userPerm.custom_permissions) {
      const customPerms = JSON.parse(userPerm.custom_permissions) as Array<{
        resource: string
        action: string
        allow: boolean
      }>

      for (const custom of customPerms) {
        const permString = `${custom.resource}:${custom.action}`
        if (custom.allow) {
          // Add if not already present
          if (!permissions.includes(permString)) {
            permissions.push(permString)
          }
        } else {
          // Remove if present (deny override)
          const index = permissions.indexOf(permString)
          if (index > -1) {
            permissions.splice(index, 1)
          }
        }
      }
    }

    return permissions
  }

  async getRolePermissions(role: string): Promise<Permission[]> {
    const rows = await this.db
      .prepare('SELECT * FROM permissions WHERE role = ?')
      .bind(role)
      .all()

    return rows.results ? rows.results.map(row => this.mapPermissionRow(row)) : []
  }

  async createUserPermission(data: CreateUserPermissionInput): Promise<UserPermission> {
    const now = Date.now()
    const id = ID.generateUserPermissionId()

    const userPermission: UserPermission = {
      id,
      user_id: data.user_id,
      location_id: data.location_id,
      role: data.role,
      custom_permissions: data.custom_permissions || [],
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: now,
      updated_at: now
    }

    await this.db
      .prepare(`
        INSERT INTO user_permissions (
          id, user_id, location_id, role, custom_permissions, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        userPermission.user_id,
        userPermission.location_id,
        userPermission.role,
        JSON.stringify(userPermission.custom_permissions),
        userPermission.is_active ? 1 : 0,
        userPermission.created_at,
        userPermission.updated_at
      )
      .run()

    return userPermission
  }

  async updateUserPermission(id: string, data: UpdateUserPermissionInput): Promise<UserPermission> {
    const existing = await this.db
      .prepare('SELECT * FROM user_permissions WHERE id = ?')
      .bind(id)
      .first()

    if (!existing) {
      throw new Error(`UserPermission not found: ${id}`)
    }

    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.role !== undefined) {
      updates.push('role = ?')
      values.push(data.role)
    }
    if (data.custom_permissions !== undefined) {
      updates.push('custom_permissions = ?')
      values.push(JSON.stringify(data.custom_permissions))
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active ? 1 : 0)
    }

    updates.push('updated_at = ?')
    values.push(now)

    values.push(id)

    await this.db
      .prepare(`UPDATE user_permissions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    const updated = await this.db
      .prepare('SELECT * FROM user_permissions WHERE id = ?')
      .bind(id)
      .first()

    return this.mapUserPermissionRow(updated!)
  }

  async deleteUserPermission(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM user_permissions WHERE id = ?').bind(id).run()
  }

  async listUserPermissions(userId: string): Promise<UserPermission[]> {
    const rows = await this.db
      .prepare('SELECT * FROM user_permissions WHERE user_id = ?')
      .bind(userId)
      .all()

    return rows.results ? rows.results.map(row => this.mapUserPermissionRow(row)) : []
  }

  private mapPermissionRow(row: any): Permission {
    return {
      id: row.id,
      role: row.role,
      resource: row.resource,
      action: row.action,
      conditions: row.conditions ? JSON.parse(row.conditions) : {},
      description: row.description,
      created_at: row.created_at
    }
  }

  private mapUserPermissionRow(row: any): UserPermission {
    return {
      id: row.id,
      user_id: row.user_id,
      location_id: row.location_id,
      role: row.role,
      custom_permissions: row.custom_permissions ? JSON.parse(row.custom_permissions) : [],
      is_active: row.is_active === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  }
}
