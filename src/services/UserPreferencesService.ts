import { DatabaseGateway } from '../db/DatabaseGateway'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export interface UserPreferences {
  id: string
  tenant_id: string
  user_id: string

  // UI Preferences
  theme?: 'light' | 'dark' | 'auto'
  sidebar_collapsed?: boolean
  default_view?: string

  // AI Assistant Preferences
  ai_window_position?: { x: number; y: number }
  ai_window_size?: { width: number; height: number }
  ai_window_docked?: boolean
  ai_quick_access_enabled?: boolean
  ai_auto_suggestions?: boolean
  ai_temperature?: number
  ai_context_length?: 'short' | 'medium' | 'long'

  // Notifications Preferences
  desktop_notifications?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  notification_sound?: boolean
  notification_types?: string[]

  // Dashboard Preferences
  dashboard_widgets?: any[]
  dashboard_layout?: 'grid' | 'list' | 'compact'

  // Contact/Pipeline Preferences
  default_pipeline_id?: string
  default_contact_view?: 'card' | 'table' | 'kanban'
  contacts_per_page?: number
  show_archived_contacts?: boolean

  // Calendar Preferences
  calendar_view?: 'day' | 'week' | 'month' | 'agenda'
  calendar_start_time?: string
  calendar_end_time?: string
  calendar_slot_duration?: number
  calendar_show_weekends?: boolean

  // Messages Preferences
  message_preview?: boolean
  message_group_by?: 'contact' | 'channel' | 'date'
  message_auto_archive?: boolean

  // Table/List Preferences
  visible_columns?: Record<string, string[]>
  column_order?: Record<string, string[]>
  sort_preferences?: Record<string, { field: string; direction: 'asc' | 'desc' }>

  // Keyboard Shortcuts
  keyboard_shortcuts_enabled?: boolean
  custom_shortcuts?: Record<string, string>

  // Language & Region
  language?: string
  timezone?: string
  date_format?: string
  time_format?: '12h' | '24h'
  currency?: string

  // Accessibility
  high_contrast?: boolean
  reduce_motion?: boolean
  text_size?: 'small' | 'medium' | 'large' | 'x-large'
  screen_reader_mode?: boolean

  // Advanced
  debug_mode?: boolean
  beta_features?: boolean
  analytics_enabled?: boolean

  // Metadata
  created_at: number
  updated_at: number
  last_synced_at?: number
}

export interface PreferenceHistory {
  id: string
  tenant_id: string
  user_id: string
  preference_key: string
  old_value: string | null
  new_value: string | null
  changed_at: number
  changed_from: 'user' | 'admin' | 'system'
}

export interface UpdatePreferencesInput {
  [key: string]: any
}

export class UserPreferencesService {
  constructor(private db: DatabaseGateway) {}

  /**
   * Get user preferences (creates default if not exists)
   */
  async getUserPreferences(tenantId: string, userId: string): Promise<UserPreferences> {
    const result = await this.db.raw(
      `SELECT * FROM user_preferences WHERE tenant_id = ? AND user_id = ?`,
      [tenantId, userId]
    )

    const rows = result.results || []
    if (rows.length > 0) {
      return this.parsePreferences(rows[0])
    }

    // Create default preferences
    return await this.createDefaultPreferences(tenantId, userId)
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(tenantId: string, userId: string): Promise<UserPreferences> {
    const id = `pref_${generateId()}`
    const now = Date.now()

    // Use INSERT OR IGNORE to handle race conditions
    await this.db.raw(
      `INSERT OR IGNORE INTO user_preferences (
        id, tenant_id, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, tenantId, userId, now, now]
    )

    // Fetch again to get the actual record (in case another request created it)
    const result = await this.db.raw(
      `SELECT * FROM user_preferences WHERE tenant_id = ? AND user_id = ?`,
      [tenantId, userId]
    )

    const rows = result.results || []
    if (rows.length > 0) {
      return this.parsePreferences(rows[0])
    }

    // This should never happen, but fallback to safe defaults
    return {
      id,
      tenant_id: tenantId,
      user_id: userId,
      created_at: now,
      updated_at: now
    } as UserPreferences
  }

  /**
   * Update user preferences (partial update)
   */
  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: UpdatePreferencesInput,
    changedFrom: 'user' | 'admin' | 'system' = 'user'
  ): Promise<UserPreferences> {
    const now = Date.now()

    // Get current preferences for history
    const current = await this.getUserPreferences(tenantId, userId)

    // Build SET clause dynamically
    const setClauses: string[] = ['updated_at = ?']
    const values: any[] = [now]

    for (const [key, value] of Object.entries(updates)) {
      if (this.isValidPreferenceKey(key)) {
        setClauses.push(`${key} = ?`)

        // Handle JSON fields
        if (this.isJsonField(key)) {
          values.push(JSON.stringify(value))
        }
        // Handle boolean fields
        else if (typeof value === 'boolean') {
          values.push(value ? 1 : 0)
        }
        // Handle null/undefined
        else if (value === null || value === undefined) {
          values.push(null)
        }
        // Regular fields
        else {
          values.push(value)
        }

        // Log change history
        await this.logPreferenceChange(
          tenantId,
          userId,
          key,
          (current as any)[key],
          value,
          changedFrom
        )
      }
    }

    values.push(tenantId, userId)

    await this.db.raw(
      `UPDATE user_preferences
       SET ${setClauses.join(', ')}
       WHERE tenant_id = ? AND user_id = ?`,
      values
    )

    return this.getUserPreferences(tenantId, userId)
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(tenantId: string, userId: string): Promise<UserPreferences> {
    const now = Date.now()

    await this.db.raw(
      `DELETE FROM user_preferences WHERE tenant_id = ? AND user_id = ?`,
      [tenantId, userId]
    )

    return await this.createDefaultPreferences(tenantId, userId)
  }

  /**
   * Get preference change history
   */
  async getPreferenceHistory(
    tenantId: string,
    userId: string,
    limit: number = 50
  ): Promise<PreferenceHistory[]> {
    const result = await this.db.raw(
      `SELECT * FROM preference_history
       WHERE tenant_id = ? AND user_id = ?
       ORDER BY changed_at DESC
       LIMIT ?`,
      [tenantId, userId, limit]
    )

    const rows = result.results || []
    return rows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      preference_key: row.preference_key,
      old_value: row.old_value,
      new_value: row.new_value,
      changed_at: row.changed_at,
      changed_from: row.changed_from as 'user' | 'admin' | 'system',
    }))
  }

  /**
   * Export all preferences for backup/transfer
   */
  async exportPreferences(tenantId: string, userId: string): Promise<string> {
    const preferences = await this.getUserPreferences(tenantId, userId)
    return JSON.stringify(preferences, null, 2)
  }

  /**
   * Import preferences from backup
   */
  async importPreferences(
    tenantId: string,
    userId: string,
    preferencesJson: string
  ): Promise<UserPreferences> {
    const imported = JSON.parse(preferencesJson)

    // Remove metadata fields that shouldn't be imported
    delete imported.id
    delete imported.tenant_id
    delete imported.user_id
    delete imported.created_at
    delete imported.updated_at
    delete imported.last_synced_at

    return await this.updatePreferences(tenantId, userId, imported, 'system')
  }

  /**
   * Log preference change to history
   */
  private async logPreferenceChange(
    tenantId: string,
    userId: string,
    key: string,
    oldValue: any,
    newValue: any,
    changedFrom: 'user' | 'admin' | 'system'
  ): Promise<void> {
    const id = `hist_${generateId()}`
    const now = Date.now()

    await this.db.raw(
      `INSERT INTO preference_history (
        id, tenant_id, user_id, preference_key, old_value, new_value, changed_at, changed_from
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        userId,
        key,
        oldValue !== undefined ? JSON.stringify(oldValue) : null,
        newValue !== undefined ? JSON.stringify(newValue) : null,
        now,
        changedFrom,
      ]
    )
  }

  /**
   * Parse database row to UserPreferences object
   */
  private parsePreferences(row: any): UserPreferences {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,

      // UI Preferences
      theme: row.theme || 'light',
      sidebar_collapsed: row.sidebar_collapsed === 1,
      default_view: row.default_view || 'dashboard',

      // AI Assistant Preferences
      ai_window_position: row.ai_window_position ? JSON.parse(row.ai_window_position) : undefined,
      ai_window_size: row.ai_window_size ? JSON.parse(row.ai_window_size) : undefined,
      ai_window_docked: row.ai_window_docked === 1,
      ai_quick_access_enabled: row.ai_quick_access_enabled === 1,
      ai_auto_suggestions: row.ai_auto_suggestions === 1,
      ai_temperature: row.ai_temperature || 0.7,
      ai_context_length: row.ai_context_length || 'medium',

      // Notifications Preferences
      desktop_notifications: row.desktop_notifications === 1,
      email_notifications: row.email_notifications === 1,
      sms_notifications: row.sms_notifications === 1,
      notification_sound: row.notification_sound === 1,
      notification_types: row.notification_types ? JSON.parse(row.notification_types) : undefined,

      // Dashboard Preferences
      dashboard_widgets: row.dashboard_widgets ? JSON.parse(row.dashboard_widgets) : undefined,
      dashboard_layout: row.dashboard_layout || 'grid',

      // Contact/Pipeline Preferences
      default_pipeline_id: row.default_pipeline_id,
      default_contact_view: row.default_contact_view || 'card',
      contacts_per_page: row.contacts_per_page || 25,
      show_archived_contacts: row.show_archived_contacts === 1,

      // Calendar Preferences
      calendar_view: row.calendar_view || 'week',
      calendar_start_time: row.calendar_start_time || '08:00',
      calendar_end_time: row.calendar_end_time || '18:00',
      calendar_slot_duration: row.calendar_slot_duration || 30,
      calendar_show_weekends: row.calendar_show_weekends === 1,

      // Messages Preferences
      message_preview: row.message_preview === 1,
      message_group_by: row.message_group_by || 'contact',
      message_auto_archive: row.message_auto_archive === 1,

      // Table/List Preferences
      visible_columns: row.visible_columns ? JSON.parse(row.visible_columns) : undefined,
      column_order: row.column_order ? JSON.parse(row.column_order) : undefined,
      sort_preferences: row.sort_preferences ? JSON.parse(row.sort_preferences) : undefined,

      // Keyboard Shortcuts
      keyboard_shortcuts_enabled: row.keyboard_shortcuts_enabled === 1,
      custom_shortcuts: row.custom_shortcuts ? JSON.parse(row.custom_shortcuts) : undefined,

      // Language & Region
      language: row.language || 'en',
      timezone: row.timezone || 'Australia/Sydney',
      date_format: row.date_format || 'DD/MM/YYYY',
      time_format: row.time_format || '24h',
      currency: row.currency || 'AUD',

      // Accessibility
      high_contrast: row.high_contrast === 1,
      reduce_motion: row.reduce_motion === 1,
      text_size: row.text_size || 'medium',
      screen_reader_mode: row.screen_reader_mode === 1,

      // Advanced
      debug_mode: row.debug_mode === 1,
      beta_features: row.beta_features === 1,
      analytics_enabled: row.analytics_enabled === 1,

      // Metadata
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_synced_at: row.last_synced_at,
    }
  }

  /**
   * Check if a key is a valid preference field
   */
  private isValidPreferenceKey(key: string): boolean {
    const validKeys = [
      'theme', 'sidebar_collapsed', 'default_view',
      'ai_window_position', 'ai_window_size', 'ai_window_docked',
      'ai_quick_access_enabled', 'ai_auto_suggestions', 'ai_temperature', 'ai_context_length',
      'desktop_notifications', 'email_notifications', 'sms_notifications',
      'notification_sound', 'notification_types',
      'dashboard_widgets', 'dashboard_layout',
      'default_pipeline_id', 'default_contact_view', 'contacts_per_page', 'show_archived_contacts',
      'calendar_view', 'calendar_start_time', 'calendar_end_time',
      'calendar_slot_duration', 'calendar_show_weekends',
      'message_preview', 'message_group_by', 'message_auto_archive',
      'visible_columns', 'column_order', 'sort_preferences',
      'keyboard_shortcuts_enabled', 'custom_shortcuts',
      'language', 'timezone', 'date_format', 'time_format', 'currency',
      'high_contrast', 'reduce_motion', 'text_size', 'screen_reader_mode',
      'debug_mode', 'beta_features', 'analytics_enabled',
    ]
    return validKeys.includes(key)
  }

  /**
   * Check if a field should be stored as JSON
   */
  private isJsonField(key: string): boolean {
    const jsonFields = [
      'ai_window_position',
      'ai_window_size',
      'notification_types',
      'dashboard_widgets',
      'visible_columns',
      'column_order',
      'sort_preferences',
      'custom_shortcuts',
    ]
    return jsonFields.includes(key)
  }
}
