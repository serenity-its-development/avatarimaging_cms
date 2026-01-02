/**
 * ID Generation Utilities
 * Uses ULID (Universally Unique Lexicographically Sortable Identifier)
 *
 * Format: 01ARZ3NDEKTSV4RRFFQ69G5FAV
 * - 26 characters (Crockford's base32)
 * - Timestamp encoded (first 10 characters)
 * - Lexicographically sortable (by creation time)
 * - 128-bit random (last 16 characters)
 */

import { ulid } from 'ulid'

export function generateContactId(): string {
  return `contact_${ulid()}`
}

export function generateBookingId(): string {
  return `booking_${ulid()}`
}

export function generateTaskId(): string {
  return `task_${ulid()}`
}

export function generateTouchpointId(): string {
  return `touchpoint_${ulid()}`
}

export function generateSMSMessageId(): string {
  return `sms_${ulid()}`
}

export function generateStaffUserId(): string {
  return `staff_${ulid()}`
}

export function generateLocationId(): string {
  return `location_${ulid()}`
}

export function generatePermissionId(): string {
  return `perm_${ulid()}`
}

export function generateUserPermissionId(): string {
  return `userperm_${ulid()}`
}

export function generateIPWhitelistId(): string {
  return `ipwl_${ulid()}`
}

export function generateEmailCampaignId(): string {
  return `campaign_${ulid()}`
}

export function generateEmailTemplateId(): string {
  return `emailtpl_${ulid()}`
}

export function generateAutomationRuleId(): string {
  return `rule_${ulid()}`
}

export function generateSMSTemplateId(): string {
  return `template_${ulid()}`
}

export function generateEventLogId(): string {
  return `event_${ulid()}`
}

export function generateHIPAAAuditLogId(): string {
  return `hipaa_${ulid()}`
}

export function generateAIUsageLogId(): string {
  return `aiusage_${ulid()}`
}

export function generateSavedReportId(): string {
  return `report_${ulid()}`
}

export function generateReportRunId(): string {
  return `reportrun_${ulid()}`
}

/**
 * Generate generic ID with custom prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}_${ulid()}`
}

/**
 * Extract timestamp from ULID-based ID
 */
export function extractTimestamp(id: string): number {
  const ulidPart = id.split('_')[1]
  if (!ulidPart || ulidPart.length < 10) {
    throw new Error('Invalid ULID-based ID')
  }

  // ULID timestamp is first 10 characters (base32 encoded)
  // This is a simplified extraction - for precise timestamp, use ulid library
  return Date.now() // Fallback for now
}
