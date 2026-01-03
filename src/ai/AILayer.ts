/**
 * AILayer - Workers AI Integration
 *
 * Centralized AI capabilities using Cloudflare Workers AI
 * Cost: $0.011/1M tokens (90% cheaper than OpenAI)
 *
 * Models:
 * - Llama 3.1 8B: General intelligence, warmness scoring, report generation
 * - Llama 3.2 1B: Fast intent detection, quick classification
 * - Mistral 7B: Backup model
 */

import type { Ai } from '../types/env'
import type { Contact, Touchpoint, SMSMessage, Task } from '../types/entities'

/**
 * AI-generated warmness analysis
 */
export interface AIWarmness {
  warmness_score: number // 0-100
  booking_likelihood: 'high' | 'medium' | 'low'
  recommended_action: string
  reasoning: string
  confidence: number // 0.0-1.0
  factors: Array<{
    factor: string
    impact: number // -10 to +10
    reason: string
  }>
}

/**
 * AI-detected SMS intent
 */
export interface AISMSIntent {
  intent: 'confirm' | 'cancel' | 'reschedule' | 'question' | 'unknown'
  confidence: number // 0.0-1.0
  suggested_response?: string
  requires_staff_attention: boolean
  detected_entities?: {
    new_date?: string
    reason?: string
    concern?: string
  }
}

/**
 * AI-enriched contact data
 */
export interface AIContactEnrichment {
  intent?: 'routine' | 'high_risk' | 'procedure' | 'referral'
  urgency?: 'urgent' | 'normal' | 'low'
  concerns?: string[]
  recommended_service?: string
  confidence: number
}

/**
 * AI-generated email campaign
 */
export interface AIEmailCampaign {
  subject: string
  body_html: string
  body_text: string
  tone: string
  estimated_effectiveness: number // 0.0-1.0
}

/**
 * AI-generated report insights
 */
export interface AIReportInsights {
  summary: string
  key_findings: string[]
  recommendations: string[]
  anomalies: Array<{
    metric: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  trends: Array<{
    metric: string
    direction: 'up' | 'down' | 'stable'
    change_percent: number
    description: string
  }>
}

/**
 * AI usage metrics
 */
export interface AIUsageMetrics {
  tokens_used: number
  duration_ms: number
  cost_usd: number
  model: string
}

/**
 * AILayer - Main AI integration class
 */
export class AILayer {
  constructor(private ai: Ai) {}

  /**
   * Analyze contact warmness using AI
   * Combines rules-based scoring with AI insights
   */
  async analyzeWarmness(
    contact: Contact,
    touchpoints: Touchpoint[],
    tasks?: Task[]
  ): Promise<{ result: AIWarmness; usage: AIUsageMetrics }> {
    const startTime = Date.now()

    // Build context for AI
    const context = {
      contact: {
        source: contact.source,
        pipeline: contact.current_pipeline,
        stage: contact.current_stage,
        is_existing_patient: contact.is_existing_patient,
        data: contact.data
      },
      touchpoints: touchpoints.slice(0, 10).map(t => ({
        type: t.type,
        channel: t.channel,
        direction: t.direction,
        created_at: t.created_at
      })),
      tasks: tasks?.map(t => ({ type: t.task_type, priority: t.priority }))
    }

    const prompt = `You are an expert medical appointment lead qualifier for a medical imaging clinic.

Analyze this lead and provide a warmness score (0-100) indicating likelihood to book and attend an appointment.

CONTACT INFO:
- Source: ${context.contact.source}
- Pipeline: ${context.contact.pipeline}
- Stage: ${context.contact.stage}
- Existing patient: ${context.contact.is_existing_patient}
- Intent: ${context.contact.data.intent || 'unknown'}

RECENT INTERACTIONS (${touchpoints.length} total):
${touchpoints.slice(0, 5).map(t => `- ${t.type} via ${t.channel} (${this.timeAgo(t.created_at)})`).join('\n')}

SCORING GUIDELINES:
- High warmness (80-100): Strong intent, quick responses, specific procedure mentioned
- Medium warmness (50-79): General inquiry, some engagement
- Low warmness (0-49): Vague inquiry, slow responses, no engagement

Respond in JSON format:
{
  "warmness_score": 85,
  "booking_likelihood": "high",
  "recommended_action": "Call within 1 hour - high urgency procedure",
  "reasoning": "Patient mentioned specific high-risk concern, responded within 5 minutes, existing patient with good history",
  "confidence": 0.92,
  "factors": [
    {"factor": "Quick response time", "impact": 10, "reason": "Replied within 5 minutes"},
    {"factor": "Specific procedure", "impact": 8, "reason": "Mentioned breast screening"}
  ]
}`

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 512,
        temperature: 0.3 // Lower temperature for more consistent scoring
      })

      const duration_ms = Date.now() - startTime
      const tokens_used = this.estimateTokens(prompt, response.response)
      const cost_usd = this.calculateCost(tokens_used, '@cf/meta/llama-3.1-8b-instruct')

      // Parse AI response
      const result = this.parseJSON<AIWarmness>(response.response, {
        warmness_score: 50,
        booking_likelihood: 'medium',
        recommended_action: 'Follow up via SMS',
        reasoning: 'Unable to analyze - using default scoring',
        confidence: 0.5,
        factors: []
      })

      return {
        result,
        usage: {
          tokens_used,
          duration_ms,
          cost_usd,
          model: '@cf/meta/llama-3.1-8b-instruct'
        }
      }
    } catch (error) {
      // Fallback to basic scoring if AI fails
      return {
        result: {
          warmness_score: this.calculateBasicWarmness(contact, touchpoints),
          booking_likelihood: 'medium',
          recommended_action: 'Review manually',
          reasoning: 'AI analysis failed - using rule-based scoring',
          confidence: 0.6,
          factors: []
        },
        usage: {
          tokens_used: 0,
          duration_ms: Date.now() - startTime,
          cost_usd: 0,
          model: 'fallback'
        }
      }
    }
  }

  /**
   * Detect intent from SMS message
   * Fast classification using Llama 3.2 1B
   */
  async detectSMSIntent(
    message: string,
    context: { contact: Contact; previous_messages?: SMSMessage[] }
  ): Promise<{ result: AISMSIntent; usage: AIUsageMetrics }> {
    const startTime = Date.now()

    const prompt = `You are an SMS intent classifier for a medical clinic.

Classify this patient SMS reply into one of: confirm, cancel, reschedule, question, unknown

MESSAGE: "${message}"

CONTEXT:
- Patient: ${context.contact.name}
- Current stage: ${context.contact.current_stage}

EXAMPLES:
- "Yep all good" → confirm
- "Can't make it sorry" → cancel
- "Can we do Thursday instead?" → reschedule
- "What parking is available?" → question

Respond in JSON:
{
  "intent": "confirm",
  "confidence": 0.95,
  "suggested_response": "Great! See you at your appointment.",
  "requires_staff_attention": false
}`

    try {
      const response = await this.ai.run('@cf/meta/llama-3.2-1b-instruct', {
        prompt,
        max_tokens: 128,
        temperature: 0.2
      })

      const duration_ms = Date.now() - startTime
      const tokens_used = this.estimateTokens(prompt, response.response)
      const cost_usd = this.calculateCost(tokens_used, '@cf/meta/llama-3.2-1b-instruct')

      const result = this.parseJSON<AISMSIntent>(response.response, {
        intent: 'unknown',
        confidence: 0.5,
        requires_staff_attention: true
      })

      return {
        result,
        usage: {
          tokens_used,
          duration_ms,
          cost_usd,
          model: '@cf/meta/llama-3.2-1b-instruct'
        }
      }
    } catch (error) {
      // Fallback to keyword matching
      return {
        result: this.detectIntentKeywords(message),
        usage: {
          tokens_used: 0,
          duration_ms: Date.now() - startTime,
          cost_usd: 0,
          model: 'fallback'
        }
      }
    }
  }

  /**
   * Enrich contact data using AI
   * Extract intent, urgency, concerns from initial data
   */
  async enrichContact(
    data: { name: string; phone: string; notes?: string; [key: string]: any }
  ): Promise<{ result: AIContactEnrichment; usage: AIUsageMetrics }> {
    const startTime = Date.now()

    if (!data.notes || data.notes.length < 10) {
      // No meaningful data to enrich
      return {
        result: { confidence: 0 },
        usage: { tokens_used: 0, duration_ms: 0, cost_usd: 0, model: 'skip' }
      }
    }

    const prompt = `Extract medical appointment intent from this inquiry:

INQUIRY: "${data.notes}"

Classify:
- intent: routine | high_risk | procedure | referral
- urgency: urgent | normal | low
- concerns: list of medical concerns mentioned
- recommended_service: specific service if mentioned

JSON format:
{
  "intent": "high_risk",
  "urgency": "urgent",
  "concerns": ["lump detected", "pain"],
  "recommended_service": "Breast Screening",
  "confidence": 0.88
}`

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 256
      })

      const duration_ms = Date.now() - startTime
      const tokens_used = this.estimateTokens(prompt, response.response)
      const cost_usd = this.calculateCost(tokens_used, '@cf/meta/llama-3.1-8b-instruct')

      const result = this.parseJSON<AIContactEnrichment>(response.response, {
        confidence: 0
      })

      return { result, usage: { tokens_used, duration_ms, cost_usd, model: '@cf/meta/llama-3.1-8b-instruct' } }
    } catch (error) {
      return {
        result: { confidence: 0 },
        usage: { tokens_used: 0, duration_ms: Date.now() - startTime, cost_usd: 0, model: 'fallback' }
      }
    }
  }

  /**
   * Generate email campaign using AI
   */
  async generateEmailCampaign(params: {
    goal: string
    audience: string
    tone?: string
    key_points?: string[]
  }): Promise<{ result: AIEmailCampaign; usage: AIUsageMetrics }> {
    const startTime = Date.now()

    const tone = params.tone || 'professional, caring, empathetic'
    const prompt = `Generate a medical clinic email campaign.

GOAL: ${params.goal}
AUDIENCE: ${params.audience}
TONE: ${tone}
KEY POINTS: ${params.key_points?.join(', ') || 'None specified'}

Requirements:
- Subject line: Compelling, 50 chars max
- Body: Professional, caring, clear call-to-action
- Include booking link placeholder: {{booking_url}}
- Patient name placeholder: {{name}}

JSON format:
{
  "subject": "Time for your screening - Book today",
  "body_html": "<p>Hi {{name}},</p><p>...</p>",
  "body_text": "Hi {{name}},\\n\\n...",
  "tone": "professional, caring",
  "estimated_effectiveness": 0.78
}`

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 1024
      })

      const duration_ms = Date.now() - startTime
      const tokens_used = this.estimateTokens(prompt, response.response)
      const cost_usd = this.calculateCost(tokens_used, '@cf/meta/llama-3.1-8b-instruct')

      const result = this.parseJSON<AIEmailCampaign>(response.response, {
        subject: 'Update from Avatar Imaging',
        body_html: '<p>Hi {{name}},</p>',
        body_text: 'Hi {{name}},',
        tone,
        estimated_effectiveness: 0.5
      })

      return { result, usage: { tokens_used, duration_ms, cost_usd, model: '@cf/meta/llama-3.1-8b-instruct' } }
    } catch (error) {
      throw new Error('Failed to generate email campaign')
    }
  }

  /**
   * Generate report insights using AI
   */
  async generateReportInsights(
    reportData: any,
    focus?: string
  ): Promise<{ result: AIReportInsights; usage: AIUsageMetrics }> {
    const startTime = Date.now()

    const prompt = `Analyze this clinic performance data and provide actionable insights.

DATA:
${JSON.stringify(reportData, null, 2)}

FOCUS: ${focus || 'overall performance'}

Provide:
1. Executive summary (2-3 sentences)
2. Key findings (3-5 bullet points)
3. Actionable recommendations (3-5 specific actions)
4. Anomalies or concerns (if any)
5. Trends analysis

JSON format:
{
  "summary": "Overall performance is strong with 15% growth in attended appointments...",
  "key_findings": ["No-show rate decreased by 25%", "SMS confirmations highly effective"],
  "recommendations": ["Continue 24hr SMS reminders", "Focus on Friday 4pm slot optimization"],
  "anomalies": [{"metric": "Friday 4pm no-shows", "description": "30% no-show rate", "severity": "high"}],
  "trends": [{"metric": "Attended appointments", "direction": "up", "change_percent": 15, "description": "Steady growth"}]
}`

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 1024
      })

      const duration_ms = Date.now() - startTime
      const tokens_used = this.estimateTokens(prompt, response.response)
      const cost_usd = this.calculateCost(tokens_used, '@cf/meta/llama-3.1-8b-instruct')

      const result = this.parseJSON<AIReportInsights>(response.response, {
        summary: 'Analysis complete',
        key_findings: [],
        recommendations: [],
        anomalies: [],
        trends: []
      })

      return { result, usage: { tokens_used, duration_ms, cost_usd, model: '@cf/meta/llama-3.1-8b-instruct' } }
    } catch (error) {
      throw new Error('Failed to generate report insights')
    }
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Calculate basic warmness score (fallback when AI fails)
   */
  private calculateBasicWarmness(contact: Contact, touchpoints: Touchpoint[]): number {
    let score = 0

    // Intent scoring (0-30 points)
    const intent = contact.data.intent as string
    if (intent === 'procedure') score += 30
    else if (intent === 'high_risk') score += 25
    else if (intent === 'routine') score += 15
    else score += 5

    // Source scoring (0-20 points)
    if (contact.source === 'referral') score += 20
    else if (contact.source === 'manychat') score += 15
    else if (contact.source === 'wix_form') score += 10
    else score += 5

    // Engagement scoring (0-30 points)
    const recentTouchpoints = touchpoints.filter(t => Date.now() - t.created_at < 24 * 60 * 60 * 1000)
    score += Math.min(30, recentTouchpoints.length * 10)

    // Existing patient bonus (0-20 points)
    if (contact.is_existing_patient) score += 20

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Keyword-based intent detection (fallback)
   */
  private detectIntentKeywords(message: string): AISMSIntent {
    const lower = message.toLowerCase()

    if (/(yes|yep|yeah|sure|confirm|ok)/i.test(lower)) {
      return {
        intent: 'confirm',
        confidence: 0.8,
        requires_staff_attention: false
      }
    }

    if (/(can't|cancel|won't|unable|no show)/i.test(lower)) {
      return {
        intent: 'cancel',
        confidence: 0.8,
        requires_staff_attention: true
      }
    }

    if (/(reschedule|change|different time|another day)/i.test(lower)) {
      return {
        intent: 'reschedule',
        confidence: 0.8,
        requires_staff_attention: true
      }
    }

    if (/\?/.test(message)) {
      return {
        intent: 'question',
        confidence: 0.7,
        requires_staff_attention: true
      }
    }

    return {
      intent: 'unknown',
      confidence: 0.5,
      requires_staff_attention: true
    }
  }

  /**
   * Parse JSON with fallback to default
   */
  private parseJSON<T>(text: string, fallback: T): T {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0])
      }
      return JSON.parse(text)
    } catch {
      return fallback
    }
  }

  /**
   * Estimate tokens (rough approximation: 1 token ≈ 4 chars)
   */
  private estimateTokens(prompt: string, response: string): number {
    return Math.ceil((prompt.length + response.length) / 4)
  }

  /**
   * Calculate cost in USD
   * Workers AI: $0.011 per 1M tokens
   */
  private calculateCost(tokens: number, model: string): number {
    const costPer1M = 0.011
    return (tokens / 1_000_000) * costPer1M
  }

  /**
   * Format timestamp as "X minutes/hours ago"
   */
  private timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  /**
   * Generate text using AI with custom parameters (for templates)
   */
  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    try {
      const model = options?.model || '@cf/meta/llama-3.1-8b-instruct'

      // Build the full prompt with system context if provided
      const fullPrompt = options?.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt

      const response = await this.ai.run(model, {
        prompt: fullPrompt,
        max_tokens: options?.maxTokens || 256,
        temperature: options?.temperature || 0.7
      })

      return response.response || ''
    } catch (error) {
      console.error('AI text generation failed:', error)
      throw error
    }
  }

  /**
   * Raw AI call for advanced use cases (chat-style models)
   */
  async raw<T = any>(params: {
    model: string
    messages: Array<{ role: string; content: string }>
    max_tokens?: number
    temperature?: number
  }): Promise<{ result: T }> {
    try {
      const response = await this.ai.run(params.model, {
        messages: params.messages,
        max_tokens: params.max_tokens || 256,
        temperature: params.temperature || 0.7
      })

      return {
        result: response as T
      }
    } catch (error) {
      console.error('AI raw call failed:', error)
      throw error
    }
  }
}
