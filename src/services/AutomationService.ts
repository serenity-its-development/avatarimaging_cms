/**
 * AutomationService - Pipeline automation rule execution
 * Handles trigger evaluation and automated actions
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { QueueGateway } from './ContactService'
import type {
  AutomationRule,
  Contact,
  Task,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput
} from '../types/entities'

export interface AutomationServiceContext {
  tenant_id: string
  user_id?: string
}

export interface AutomationEvent {
  type: string
  contact_id?: string
  booking_id?: string
  task_id?: string
  tenant_id: string
  [key: string]: any
}

export interface AutomationExecutionResult {
  rule_id: string
  rule_name: string
  triggered: boolean
  actions_executed: number
  errors: string[]
}

export class AutomationService {
  constructor(
    private db: DatabaseGateway,
    private queue: QueueGateway
  ) {}

  /**
   * Create automation rule
   */
  async createRule(
    data: CreateAutomationRuleInput,
    context: AutomationServiceContext
  ): Promise<AutomationRule> {
    return this.db.automationRules.create(data)
  }

  /**
   * Update automation rule
   */
  async updateRule(
    id: string,
    data: UpdateAutomationRuleInput,
    context: AutomationServiceContext
  ): Promise<AutomationRule> {
    return this.db.automationRules.update(id, data)
  }

  /**
   * Delete automation rule
   */
  async deleteRule(id: string): Promise<void> {
    return this.db.automationRules.delete(id)
  }

  /**
   * List automation rules
   */
  async listRules(tenantId: string): Promise<AutomationRule[]> {
    return this.db.automationRules.list(tenantId)
  }

  /**
   * Process automation event from queue
   */
  async processEvent(event: AutomationEvent): Promise<AutomationExecutionResult[]> {
    const rules = await this.db.automationRules.findByTrigger(event.tenant_id, event.type)

    const results: AutomationExecutionResult[] = []

    for (const rule of rules) {
      const result = await this.executeRule(rule, event)
      results.push(result)
    }

    return results
  }

  /**
   * Execute single automation rule
   */
  private async executeRule(
    rule: AutomationRule,
    event: AutomationEvent
  ): Promise<AutomationExecutionResult> {
    const result: AutomationExecutionResult = {
      rule_id: rule.id,
      rule_name: rule.name,
      triggered: false,
      actions_executed: 0,
      errors: []
    }

    try {
      // Check if rule conditions are met
      const conditionsMet = await this.evaluateConditions(rule, event)

      if (!conditionsMet) {
        return result
      }

      result.triggered = true

      // Execute actions
      for (const action of rule.actions) {
        try {
          await this.executeAction(action, event, rule.tenant_id)
          result.actions_executed++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`Action ${action.type} failed: ${errorMessage}`)
        }
      }

      // Update rule execution stats
      await this.db.automationRules.update(rule.id, {
        last_triggered_at: Date.now(),
        execution_count: (rule.execution_count || 0) + 1
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Rule execution failed: ${errorMessage}`)
    }

    return result
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(
    rule: AutomationRule,
    event: AutomationEvent
  ): Promise<boolean> {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true // No conditions = always trigger
    }

    // Get contact if event has contact_id
    let contact: Contact | null = null
    if (event.contact_id) {
      contact = await this.db.contacts.get(event.contact_id)
    }

    // Evaluate each condition
    for (const condition of rule.conditions) {
      const met = this.evaluateCondition(condition, event, contact)
      if (!met) {
        return false // All conditions must be met
      }
    }

    return true
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: any,
    event: AutomationEvent,
    contact: Contact | null
  ): boolean {
    const { field, operator, value } = condition

    // Get field value from contact or event
    let fieldValue: any
    if (contact && field.startsWith('contact.')) {
      const contactField = field.replace('contact.', '')
      fieldValue = (contact as any)[contactField]
    } else if (field.startsWith('event.')) {
      const eventField = field.replace('event.', '')
      fieldValue = event[eventField]
    } else {
      return false
    }

    // Evaluate operator
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return fieldValue > value
      case 'less_than':
        return fieldValue < value
      case 'greater_than_or_equal':
        return fieldValue >= value
      case 'less_than_or_equal':
        return fieldValue <= value
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value)
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(value)
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue)
      default:
        return false
    }
  }

  /**
   * Execute automation action
   */
  private async executeAction(
    action: any,
    event: AutomationEvent,
    tenantId: string
  ): Promise<void> {
    const { type, params } = action

    switch (type) {
      case 'update_contact':
        await this.actionUpdateContact(event, params)
        break

      case 'create_task':
        await this.actionCreateTask(event, params, tenantId)
        break

      case 'send_sms':
        await this.actionSendSMS(event, params)
        break

      case 'send_email':
        await this.actionSendEmail(event, params)
        break

      case 'assign_to_staff':
        await this.actionAssignToStaff(event, params)
        break

      case 'add_tag':
        await this.actionAddTag(event, params)
        break

      case 'move_pipeline':
        await this.actionMovePipeline(event, params)
        break

      default:
        throw new Error(`Unknown action type: ${type}`)
    }
  }

  /**
   * Action: Update contact
   */
  private async actionUpdateContact(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    await this.db.contacts.update(event.contact_id, params)
  }

  /**
   * Action: Create task
   */
  private async actionCreateTask(
    event: AutomationEvent,
    params: any,
    tenantId: string
  ): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    const contact = await this.db.contacts.get(event.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${event.contact_id}`)
    }

    // Calculate due date
    let dueDate: number | undefined
    if (params.due_in_hours) {
      dueDate = Date.now() + params.due_in_hours * 60 * 60 * 1000
    } else if (params.due_in_days) {
      dueDate = Date.now() + params.due_in_days * 24 * 60 * 60 * 1000
    }

    await this.db.tasks.create({
      tenant_id: tenantId,
      contact_id: event.contact_id,
      title: this.interpolateString(params.title, { contact, event }),
      description: params.description ? this.interpolateString(params.description, { contact, event }) : undefined,
      task_type: params.task_type || 'follow_up',
      priority: params.priority || 'medium',
      status: 'pending',
      assigned_to: params.assigned_to,
      due_date: dueDate
    })
  }

  /**
   * Action: Send SMS
   */
  private async actionSendSMS(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    const contact = await this.db.contacts.get(event.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${event.contact_id}`)
    }

    // Use template or custom message
    let message: string
    if (params.template_id) {
      const template = await this.db.smsTemplates.get(params.template_id)
      if (!template) {
        throw new Error(`SMS template not found: ${params.template_id}`)
      }
      message = this.interpolateString(template.message_template, { contact, event })
    } else if (params.message) {
      message = this.interpolateString(params.message, { contact, event })
    } else {
      throw new Error('No template_id or message provided')
    }

    await this.queue.send('sms', {
      type: 'automation_sms',
      contact_id: contact.id,
      phone: contact.phone,
      message,
      tenant_id: event.tenant_id
    })
  }

  /**
   * Action: Send email
   */
  private async actionSendEmail(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    const contact = await this.db.contacts.get(event.contact_id)
    if (!contact || !contact.email) {
      throw new Error(`Contact not found or has no email: ${event.contact_id}`)
    }

    // Use template or custom content
    let subject: string
    let bodyHtml: string
    let bodyText: string

    if (params.template_id) {
      const template = await this.db.emailTemplates.get(params.template_id)
      if (!template) {
        throw new Error(`Email template not found: ${params.template_id}`)
      }
      subject = this.interpolateString(template.subject, { contact, event })
      bodyHtml = this.interpolateString(template.body_html, { contact, event })
      bodyText = this.interpolateString(template.body_text, { contact, event })
    } else {
      subject = this.interpolateString(params.subject, { contact, event })
      bodyHtml = this.interpolateString(params.body_html, { contact, event })
      bodyText = this.interpolateString(params.body_text, { contact, event })
    }

    await this.queue.send('email', {
      type: 'automation_email',
      contact_id: contact.id,
      to: contact.email,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      tenant_id: event.tenant_id
    })
  }

  /**
   * Action: Assign to staff
   */
  private async actionAssignToStaff(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    // Create assignment task
    await this.db.tasks.create({
      tenant_id: event.tenant_id,
      contact_id: event.contact_id,
      title: `New lead assigned`,
      task_type: 'follow_up',
      priority: 'medium',
      status: 'pending',
      assigned_to: params.staff_id,
      due_date: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })
  }

  /**
   * Action: Add tag
   */
  private async actionAddTag(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    const contact = await this.db.contacts.get(event.contact_id)
    if (!contact) {
      throw new Error(`Contact not found: ${event.contact_id}`)
    }

    const currentTags = contact.data?.tags || []
    const newTags = Array.isArray(params.tags) ? params.tags : [params.tag]

    await this.db.contacts.update(event.contact_id, {
      data: {
        ...contact.data,
        tags: [...new Set([...currentTags, ...newTags])]
      }
    })
  }

  /**
   * Action: Move to pipeline/stage
   */
  private async actionMovePipeline(event: AutomationEvent, params: any): Promise<void> {
    if (!event.contact_id) {
      throw new Error('No contact_id in event')
    }

    const updates: any = {}
    if (params.pipeline) {
      updates.current_pipeline = params.pipeline
    }
    if (params.stage) {
      updates.current_stage = params.stage
    }

    await this.db.contacts.update(event.contact_id, updates)
  }

  /**
   * Interpolate template strings with data
   */
  private interpolateString(
    template: string,
    data: { contact?: Contact | null; event?: AutomationEvent }
  ): string {
    let result = template

    if (data.contact) {
      result = result.replace(/\{\{contact\.name\}\}/g, data.contact.name || '')
      result = result.replace(/\{\{contact\.first_name\}\}/g, data.contact.name?.split(' ')[0] || '')
      result = result.replace(/\{\{contact\.phone\}\}/g, data.contact.phone)
      result = result.replace(/\{\{contact\.email\}\}/g, data.contact.email || '')
    }

    if (data.event) {
      result = result.replace(/\{\{event\.type\}\}/g, data.event.type)
    }

    return result
  }

  /**
   * Test automation rule without executing
   */
  async testRule(
    ruleId: string,
    testEvent: AutomationEvent
  ): Promise<{
    conditions_met: boolean
    actions_to_execute: string[]
    evaluation_details: any
  }> {
    const rule = await this.db.automationRules.get(ruleId)
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`)
    }

    const conditionsMet = await this.evaluateConditions(rule, testEvent)

    const actionsToExecute = conditionsMet
      ? rule.actions.map((a: any) => `${a.type}: ${JSON.stringify(a.params)}`)
      : []

    return {
      conditions_met: conditionsMet,
      actions_to_execute: actionsToExecute,
      evaluation_details: {
        trigger: rule.trigger_event,
        conditions: rule.conditions,
        test_event: testEvent
      }
    }
  }
}
