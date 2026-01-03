import { D1DatabaseGateway } from '../db/DatabaseGateway'
import { AILayer } from '../ai/AILayer'
import type { Task } from './TaskService'

export interface TaskExecutionResult {
  success: boolean
  action_taken: string
  result_summary: string
  ai_reasoning: string
  error?: string
}

/**
 * AI Task Processor
 * Processes and executes tasks assigned to AI
 */
export class AITaskProcessor {
  constructor(
    private db: D1DatabaseGateway,
    private ai: AILayer
  ) {}

  /**
   * Process a task assigned to AI
   */
  async processTask(taskId: string): Promise<TaskExecutionResult> {
    // Get task details
    const taskResult = await this.db.raw(
      `SELECT * FROM tasks WHERE id = ? AND assigned_to = 'ai_assistant'`,
      [taskId]
    )

    const rows = taskResult.results || []
    if (!rows.length) {
      return {
        success: false,
        action_taken: 'none',
        result_summary: 'Task not found or not assigned to AI',
        ai_reasoning: '',
        error: 'Task not found',
      }
    }

    const task = rows[0] as any

    // Get contact context if contact_id exists
    let contactContext = ''
    if (task.contact_id) {
      const contact = await this.db.contacts.get(task.contact_id)
      if (contact) {
        contactContext = `
Contact Information:
- Name: ${contact.name}
- Phone: ${contact.phone || 'N/A'}
- Email: ${contact.email || 'N/A'}
- Tags: ${contact.tags || 'None'}
`
      }
    }

    // Determine action based on task type
    const result = await this.executeTaskByType(task, contactContext)

    // Update task with result
    await this.updateTaskWithResult(taskId, result)

    return result
  }

  /**
   * Execute task based on type
   */
  private async executeTaskByType(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const taskType = task.type

    switch (taskType) {
      case 'follow_up':
        return await this.handleFollowUpTask(task, contactContext)

      case 'call':
        return await this.handleCallTask(task, contactContext)

      case 'email':
        return await this.handleEmailTask(task, contactContext)

      case 'sms':
        return await this.handleSMSTask(task, contactContext)

      default:
        return await this.handleGenericTask(task, contactContext)
    }
  }

  /**
   * Handle follow-up task
   */
  private async handleFollowUpTask(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const prompt = `You are an AI assistant helping with a follow-up task.

Task: ${task.title}
Description: ${task.description || 'No additional details'}
Priority: ${task.priority}

${contactContext}

Based on this task, determine the best follow-up action and draft a message or plan.
Provide:
1. What action should be taken
2. Draft message (if applicable)
3. Your reasoning

Be specific and actionable.`

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 512,
      })

      return {
        success: true,
        action_taken: 'follow_up_drafted',
        result_summary: response,
        ai_reasoning: 'Analyzed task and contact context to create follow-up plan',
      }
    } catch (error) {
      return {
        success: false,
        action_taken: 'error',
        result_summary: 'Failed to process follow-up task',
        ai_reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle call task
   */
  private async handleCallTask(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const prompt = `You are an AI assistant preparing a call script.

Task: ${task.title}
Description: ${task.description || 'No additional details'}
Priority: ${task.priority}

${contactContext}

Create a professional call script including:
1. Opening greeting
2. Main talking points
3. Key questions to ask
4. Closing and next steps

Be concise and professional.`

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 512,
      })

      return {
        success: true,
        action_taken: 'call_script_created',
        result_summary: response,
        ai_reasoning: 'Generated call script based on task details and contact information',
      }
    } catch (error) {
      return {
        success: false,
        action_taken: 'error',
        result_summary: 'Failed to create call script',
        ai_reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle email task
   */
  private async handleEmailTask(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const prompt = `You are an AI assistant drafting an email.

Task: ${task.title}
Description: ${task.description || 'No additional details'}
Priority: ${task.priority}

${contactContext}

Draft a professional email including:
1. Subject line
2. Email body
3. Professional closing

Use a friendly but professional tone.`

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 512,
      })

      return {
        success: true,
        action_taken: 'email_drafted',
        result_summary: response,
        ai_reasoning: 'Generated email draft based on task requirements',
      }
    } catch (error) {
      return {
        success: false,
        action_taken: 'error',
        result_summary: 'Failed to draft email',
        ai_reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle SMS task
   */
  private async handleSMSTask(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const prompt = `You are an AI assistant drafting an SMS message.

Task: ${task.title}
Description: ${task.description || 'No additional details'}
Priority: ${task.priority}

${contactContext}

Draft a concise SMS message (160 characters or less) that is:
1. Clear and direct
2. Professional but friendly
3. Actionable

Keep it brief!`

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 128,
      })

      return {
        success: true,
        action_taken: 'sms_drafted',
        result_summary: response,
        ai_reasoning: 'Generated SMS draft optimized for brevity',
      }
    } catch (error) {
      return {
        success: false,
        action_taken: 'error',
        result_summary: 'Failed to draft SMS',
        ai_reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle generic task
   */
  private async handleGenericTask(task: any, contactContext: string): Promise<TaskExecutionResult> {
    const prompt = `You are an AI assistant helping with a task.

Task: ${task.title}
Type: ${task.type}
Description: ${task.description || 'No additional details'}
Priority: ${task.priority}

${contactContext}

Analyze this task and provide:
1. What needs to be done
2. Recommended next steps
3. Any important considerations

Be specific and helpful.`

    try {
      const response = await this.ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 512,
      })

      return {
        success: true,
        action_taken: 'task_analyzed',
        result_summary: response,
        ai_reasoning: 'Analyzed task and provided recommendations',
      }
    } catch (error) {
      return {
        success: false,
        action_taken: 'error',
        result_summary: 'Failed to analyze task',
        ai_reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update task with AI execution result
   */
  private async updateTaskWithResult(taskId: string, result: TaskExecutionResult): Promise<void> {
    const now = Date.now()
    const notes = `🤖 AI Assistant Result:

Action: ${result.action_taken}
${result.error ? `Error: ${result.error}\n` : ''}
${result.result_summary}

---
AI Reasoning: ${result.ai_reasoning}`

    if (result.success) {
      // Mark as completed
      await this.db.raw(
        `UPDATE tasks
         SET status = 'completed',
             completed_at = ?,
             notes = ?,
             updated_at = ?
         WHERE id = ?`,
        [now, notes, now, taskId]
      )
    } else {
      // Add notes but keep pending for human review
      await this.db.raw(
        `UPDATE tasks
         SET notes = ?,
             updated_at = ?
         WHERE id = ?`,
        [notes, now, taskId]
      )
    }
  }

  /**
   * Process all pending AI tasks
   * Call this from a queue consumer or cron job
   */
  async processPendingAITasks(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const result = await this.db.raw(
      `SELECT id FROM tasks
       WHERE assigned_to = 'ai_assistant'
         AND status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT 10`
    )

    const rows = result.results || []
    let processed = 0
    let succeeded = 0
    let failed = 0

    for (const row of rows as any[]) {
      try {
        const taskResult = await this.processTask(row.id)
        processed++
        if (taskResult.success) {
          succeeded++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to process AI task ${row.id}:`, error)
        failed++
      }
    }

    return { processed, succeeded, failed }
  }
}
