/**
 * ContactService - Business logic for contact management
 * Integrates DatabaseGateway + AILayer for AI-powered lead management
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import type {
  Contact,
  Touchpoint,
  Task,
  CreateContactInput,
  UpdateContactInput
} from '../types/entities'

export interface QueueGateway {
  send(queue: string, message: any): Promise<void>
}

export interface ContactServiceContext {
  tenant_id: string
  user_id: string
  ip_address?: string
}

export interface CreateContactResult {
  contact: Contact
  warmness_calculated: boolean
  ai_cost_usd: number
}

export interface UpdateContactResult {
  contact: Contact
  warmness_recalculated: boolean
  ai_cost_usd: number
}

export class ContactService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  /**
   * Create new contact with AI enrichment and warmness calculation
   */
  async create(
    data: CreateContactInput,
    context: ContactServiceContext
  ): Promise<CreateContactResult> {
    let totalAICost = 0

    // 1. AI enrichment if notes provided
    let enrichedData = { ...data }
    if (data.data?.notes) {
      try {
        const { result: enrichment, usage } = await this.ai.enrichContact({
          name: data.name,
          phone: data.phone,
          email: data.email,
          source: data.source,
          notes: data.data.notes,
          pipeline: data.current_pipeline,
          stage: data.current_stage
        })

        totalAICost += usage.cost_usd

        // Merge AI enrichment into contact data
        enrichedData.data = {
          ...enrichedData.data,
          ai_intent: enrichment.intent,
          ai_urgency: enrichment.urgency,
          ai_concerns: enrichment.concerns,
          ai_recommended_service: enrichment.recommended_service
        }

        // Log AI usage
        await this.db.aiUsageLog.create({
          tenant_id: context.tenant_id,
          model: usage.model,
          use_case: 'contact_enrichment',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: data.data.notes.length,
          output_size: JSON.stringify(enrichment).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({ contact_source: data.source })
        })
      } catch (error) {
        console.error('AI enrichment failed, continuing without it:', error)
      }
    }

    // 2. Create contact via DatabaseGateway
    const contact = await this.db.contacts.create(enrichedData)

    // 3. Calculate initial warmness with AI
    let warmnessCalculated = false
    try {
      const touchpoints = await this.db.touchpoints.list({ contact_id: contact.id })
      const { result: warmness, usage } = await this.ai.analyzeWarmness(contact, touchpoints)

      totalAICost += usage.cost_usd

      // Update contact with warmness
      await this.db.contacts.updateWarmness(
        contact.id,
        warmness.warmness_score,
        warmness.reasoning
      )

      // Update local contact object
      contact.warmness_score = warmness.warmness_score
      contact.warmness_reasoning = warmness.reasoning
      contact.warmness_updated_at = Date.now()

      warmnessCalculated = true

      // Log AI usage
      await this.db.aiUsageLog.create({
        tenant_id: context.tenant_id,
        model: usage.model,
        use_case: 'warmness_scoring',
        tokens_used: usage.tokens_used,
        cost_usd: usage.cost_usd,
        input_size: JSON.stringify({ contact, touchpoints }).length,
        output_size: JSON.stringify(warmness).length,
        duration_ms: usage.duration_ms,
        metadata: JSON.stringify({
          warmness_score: warmness.warmness_score,
          booking_likelihood: warmness.booking_likelihood
        })
      })
    } catch (error) {
      console.error('AI warmness calculation failed:', error)
    }

    // 4. Emit event for automation processing
    await this.queue.send('automation', {
      type: 'contact_created',
      contact_id: contact.id,
      tenant_id: context.tenant_id,
      warmness_score: contact.warmness_score,
      pipeline: contact.current_pipeline,
      stage: contact.current_stage
    })

    return {
      contact,
      warmness_calculated: warmnessCalculated,
      ai_cost_usd: totalAICost
    }
  }

  /**
   * Update contact with optional warmness recalculation
   */
  async update(
    id: string,
    data: UpdateContactInput,
    context: ContactServiceContext
  ): Promise<UpdateContactResult> {
    let totalAICost = 0

    // Get existing contact
    const existing = await this.db.contacts.get(id)
    if (!existing) {
      throw new Error(`Contact not found: ${id}`)
    }

    // Update contact
    const contact = await this.db.contacts.update(id, data)

    // Recalculate warmness if pipeline/stage changed
    let warmnessRecalculated = false
    const pipelineChanged = data.current_pipeline && data.current_pipeline !== existing.current_pipeline
    const stageChanged = data.current_stage && data.current_stage !== existing.current_stage

    if (pipelineChanged || stageChanged) {
      try {
        const touchpoints = await this.db.touchpoints.list({ contact_id: contact.id })
        const { result: warmness, usage } = await this.ai.analyzeWarmness(contact, touchpoints)

        totalAICost += usage.cost_usd

        await this.db.contacts.updateWarmness(
          contact.id,
          warmness.warmness_score,
          warmness.reasoning
        )

        contact.warmness_score = warmness.warmness_score
        contact.warmness_reasoning = warmness.reasoning
        contact.warmness_updated_at = Date.now()

        warmnessRecalculated = true

        await this.db.aiUsageLog.create({
          tenant_id: context.tenant_id,
          model: usage.model,
          use_case: 'warmness_recalculation',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: JSON.stringify({ contact, touchpoints }).length,
          output_size: JSON.stringify(warmness).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({
            warmness_score: warmness.warmness_score,
            pipeline_changed: pipelineChanged,
            stage_changed: stageChanged
          })
        })
      } catch (error) {
        console.error('AI warmness recalculation failed:', error)
      }
    }

    // Emit update event
    await this.queue.send('automation', {
      type: 'contact_updated',
      contact_id: contact.id,
      tenant_id: context.tenant_id,
      changes: Object.keys(data),
      warmness_score: contact.warmness_score
    })

    return {
      contact,
      warmness_recalculated: warmnessRecalculated,
      ai_cost_usd: totalAICost
    }
  }

  /**
   * Manually recalculate contact warmness
   */
  async recalculateWarmness(
    id: string,
    context: ContactServiceContext
  ): Promise<{ warmness_score: number; reasoning: string; cost_usd: number }> {
    const contact = await this.db.contacts.get(id)
    if (!contact) {
      throw new Error(`Contact not found: ${id}`)
    }

    const touchpoints = await this.db.touchpoints.list({ contact_id: contact.id })
    const tasks = await this.db.tasks.list({ contact_id: contact.id })

    const { result: warmness, usage } = await this.ai.analyzeWarmness(
      contact,
      touchpoints,
      tasks
    )

    await this.db.contacts.updateWarmness(
      contact.id,
      warmness.warmness_score,
      warmness.reasoning
    )

    await this.db.aiUsageLog.create({
      tenant_id: context.tenant_id,
      model: usage.model,
      use_case: 'warmness_manual_recalculation',
      tokens_used: usage.tokens_used,
      cost_usd: usage.cost_usd,
      input_size: JSON.stringify({ contact, touchpoints, tasks }).length,
      output_size: JSON.stringify(warmness).length,
      duration_ms: usage.duration_ms,
      metadata: JSON.stringify({ warmness_score: warmness.warmness_score })
    })

    return {
      warmness_score: warmness.warmness_score,
      reasoning: warmness.reasoning,
      cost_usd: usage.cost_usd
    }
  }

  /**
   * Search contacts by name, phone, or email
   */
  async search(
    query: string,
    tenantId: string
  ): Promise<Contact[]> {
    return this.db.contacts.search(query, tenantId)
  }

  /**
   * Get contact with full history
   */
  async getWithHistory(id: string): Promise<{
    contact: Contact
    touchpoints: Touchpoint[]
    tasks: Task[]
  }> {
    const contact = await this.db.contacts.get(id)
    if (!contact) {
      throw new Error(`Contact not found: ${id}`)
    }

    const touchpoints = await this.db.touchpoints.list({ contact_id: id })
    const tasks = await this.db.tasks.list({ contact_id: id })

    return { contact, touchpoints, tasks }
  }

  /**
   * Assign follow-up task based on warmness and pipeline
   */
  async assignFollowUpTask(
    contactId: string,
    context: ContactServiceContext
  ): Promise<Task> {
    const contact = await this.db.contacts.get(contactId)
    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`)
    }

    // Determine task priority based on warmness
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    if (contact.warmness_score >= 80) priority = 'urgent'
    else if (contact.warmness_score >= 60) priority = 'high'
    else if (contact.warmness_score <= 30) priority = 'low'

    // Determine due date based on warmness
    const now = Date.now()
    let dueDate = now + 24 * 60 * 60 * 1000 // Default: 24 hours
    if (contact.warmness_score >= 80) dueDate = now + 2 * 60 * 60 * 1000 // 2 hours for hot leads
    else if (contact.warmness_score >= 60) dueDate = now + 4 * 60 * 60 * 1000 // 4 hours for warm leads
    else if (contact.warmness_score <= 30) dueDate = now + 72 * 60 * 60 * 1000 // 3 days for cold leads

    // Create task
    const task = await this.db.tasks.create({
      tenant_id: context.tenant_id,
      contact_id: contactId,
      title: `Follow up with ${contact.name}`,
      description: contact.warmness_reasoning || 'Follow up on lead',
      task_type: 'follow_up',
      priority,
      status: 'pending',
      assigned_to: context.user_id,
      due_date: dueDate
    })

    // Emit event
    await this.queue.send('automation', {
      type: 'task_created',
      task_id: task.id,
      contact_id: contactId,
      tenant_id: context.tenant_id,
      priority
    })

    return task
  }

  /**
   * Delete contact (soft delete - mark as inactive)
   */
  async delete(id: string, context: ContactServiceContext): Promise<void> {
    await this.db.contacts.delete(id)

    await this.queue.send('automation', {
      type: 'contact_deleted',
      contact_id: id,
      tenant_id: context.tenant_id,
      deleted_by: context.user_id
    })
  }

  /**
   * Bulk warmness recalculation (for cron job)
   */
  async bulkRecalculateWarmness(
    tenantId: string,
    minAge: number = 24 * 60 * 60 * 1000 // Default: 24 hours
  ): Promise<{ processed: number; total_cost_usd: number }> {
    const now = Date.now()
    const cutoff = now - minAge

    // Find contacts with stale warmness
    const contacts = await this.db.contacts.list({
      tenant_id: tenantId,
      limit: 100,
      order_by: 'warmness_updated_at',
      order_dir: 'asc'
    })

    let processed = 0
    let totalCost = 0

    for (const contact of contacts.data) {
      // Skip if recently updated
      if (contact.warmness_updated_at && contact.warmness_updated_at > cutoff) {
        continue
      }

      try {
        const touchpoints = await this.db.touchpoints.list({ contact_id: contact.id })
        const { result: warmness, usage } = await this.ai.analyzeWarmness(contact, touchpoints)

        await this.db.contacts.updateWarmness(
          contact.id,
          warmness.warmness_score,
          warmness.reasoning
        )

        totalCost += usage.cost_usd
        processed++

        await this.db.aiUsageLog.create({
          tenant_id: tenantId,
          model: usage.model,
          use_case: 'warmness_bulk_recalculation',
          tokens_used: usage.tokens_used,
          cost_usd: usage.cost_usd,
          input_size: JSON.stringify({ contact, touchpoints }).length,
          output_size: JSON.stringify(warmness).length,
          duration_ms: usage.duration_ms,
          metadata: JSON.stringify({ contact_id: contact.id })
        })
      } catch (error) {
        console.error(`Failed to recalculate warmness for ${contact.id}:`, error)
      }
    }

    return { processed, total_cost_usd: totalCost }
  }
}
