/**
 * TagService - Business logic for tag management
 * Handles CRUD operations and AI-powered tag suggestions
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import type { AILayer } from '../ai/AILayer'
import { ulid } from 'ulid'

export interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  category: string
  usage_count: number
  is_ai_generated: boolean
  ai_reasoning?: string
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface ContactTag {
  id: string
  contact_id: string
  tag_id: string
  added_by?: string
  confidence?: number
  created_at: number
  tag?: Tag // Joined tag data
}

export interface CreateTagInput {
  name: string
  description?: string
  color?: string
  category: string
}

export interface UpdateTagInput {
  name?: string
  description?: string
  color?: string
  category?: string
  is_active?: boolean
}

export interface AITagSuggestion {
  tag_name: string
  slug: string
  category: string
  reasoning: string
  confidence: number
  color?: string
}

export class TagService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer
  ) {}

  /**
   * Get all tags with optional category filter
   */
  async listAll(category?: string, includeInactive = false): Promise<Tag[]> {
    let query = 'SELECT * FROM tags'
    const params: any[] = []

    const conditions: string[] = []
    if (!includeInactive) {
      conditions.push('is_active = 1')
    }
    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY category, name'

    return await this.db.raw<Tag[]>(query, params)
  }

  /**
   * Get tag by ID
   */
  async getById(id: string): Promise<Tag | null> {
    const tags = await this.db.raw<Tag[]>('SELECT * FROM tags WHERE id = ?', [id])
    return tags.length > 0 ? tags[0] : null
  }

  /**
   * Get tag by slug
   */
  async getBySlug(slug: string): Promise<Tag | null> {
    const tags = await this.db.raw<Tag[]>('SELECT * FROM tags WHERE slug = ?', [slug])
    return tags.length > 0 ? tags[0] : null
  }

  /**
   * Create new tag
   */
  async create(input: CreateTagInput, isAI = false, aiReasoning?: string): Promise<Tag> {
    const now = Date.now()
    const tagId = `tag_${ulid()}`
    const slug = this.generateSlug(input.name)

    await this.db.raw(
      `INSERT INTO tags (id, name, slug, description, color, category, is_ai_generated, ai_reasoning, is_active, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tagId,
        input.name,
        slug,
        input.description || null,
        input.color || this.getDefaultColorForCategory(input.category),
        input.category,
        isAI ? 1 : 0,
        aiReasoning || null,
        true,
        0,
        now,
        now
      ]
    )

    const created = await this.getById(tagId)
    if (!created) throw new Error('Failed to create tag')
    return created
  }

  /**
   * Update tag
   */
  async update(id: string, input: UpdateTagInput): Promise<Tag> {
    const now = Date.now()
    const sets: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      sets.push('name = ?')
      values.push(input.name)
      sets.push('slug = ?')
      values.push(this.generateSlug(input.name))
    }
    if (input.description !== undefined) {
      sets.push('description = ?')
      values.push(input.description)
    }
    if (input.color !== undefined) {
      sets.push('color = ?')
      values.push(input.color)
    }
    if (input.category !== undefined) {
      sets.push('category = ?')
      values.push(input.category)
    }
    if (input.is_active !== undefined) {
      sets.push('is_active = ?')
      values.push(input.is_active ? 1 : 0)
    }

    sets.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db.raw(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`, values)

    const updated = await this.getById(id)
    if (!updated) throw new Error('Tag not found')
    return updated
  }

  /**
   * Delete tag
   */
  async delete(id: string): Promise<void> {
    // First remove all contact associations
    await this.db.raw('DELETE FROM contact_tags WHERE tag_id = ?', [id])
    // Then delete the tag
    await this.db.raw('DELETE FROM tags WHERE id = ?', [id])
  }

  /**
   * Get tags for a contact
   */
  async getContactTags(contactId: string): Promise<ContactTag[]> {
    const results = await this.db.raw<any[]>(
      `SELECT ct.*, t.*
       FROM contact_tags ct
       JOIN tags t ON ct.tag_id = t.id
       WHERE ct.contact_id = ?
       ORDER BY t.category, t.name`,
      [contactId]
    )

    // Map results to ContactTag with embedded Tag
    return results.map(row => ({
      id: row.id,
      contact_id: row.contact_id,
      tag_id: row.tag_id,
      added_by: row.added_by,
      confidence: row.confidence,
      created_at: row.created_at,
      tag: {
        id: row.tag_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        color: row.color,
        category: row.category,
        usage_count: row.usage_count,
        is_ai_generated: !!row.is_ai_generated,
        ai_reasoning: row.ai_reasoning,
        is_active: !!row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }))
  }

  /**
   * Add tag to contact
   */
  async addTagToContact(
    contactId: string,
    tagId: string,
    addedBy: string = 'system',
    confidence?: number
  ): Promise<void> {
    const now = Date.now()
    const id = `ct_${ulid()}`

    try {
      await this.db.raw(
        `INSERT INTO contact_tags (id, contact_id, tag_id, added_by, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, contactId, tagId, addedBy, confidence || null, now]
      )

      // Increment usage count
      await this.db.raw(
        'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
        [tagId]
      )
    } catch (error: any) {
      // Ignore duplicate key errors (tag already applied)
      if (!error.message?.includes('UNIQUE constraint')) {
        throw error
      }
    }
  }

  /**
   * Remove tag from contact
   */
  async removeTagFromContact(contactId: string, tagId: string): Promise<void> {
    await this.db.raw(
      'DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?',
      [contactId, tagId]
    )

    // Decrement usage count
    await this.db.raw(
      'UPDATE tags SET usage_count = CASE WHEN usage_count > 0 THEN usage_count - 1 ELSE 0 END WHERE id = ?',
      [tagId]
    )
  }

  /**
   * AI-powered tag suggestions based on contact data
   */
  async suggestTags(contactData: {
    name: string
    phone?: string
    email?: string
    source: string
    data?: Record<string, any>
    current_pipeline?: string
    warmness_score?: number
  }): Promise<AITagSuggestion[]> {
    const prompt = this.buildTagSuggestionPrompt(contactData)

    try {
      const response = await this.ai.raw<{ tags: AITagSuggestion[] }>({
        model: '@cf/meta/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a medical practice CRM assistant. Analyze patient data and suggest relevant demographic and behavioral tags. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 512
      })

      // Parse AI response
      if (response.result?.response) {
        const parsed = this.parseAITagResponse(response.result.response)
        return parsed
      }

      return []
    } catch (error) {
      console.error('AI tag suggestion failed:', error)
      return []
    }
  }

  /**
   * Automatically apply AI-suggested tags to a contact
   */
  async autoTagContact(
    contactId: string,
    contactData: {
      name: string
      phone?: string
      email?: string
      source: string
      data?: Record<string, any>
      current_pipeline?: string
      warmness_score?: number
    },
    minConfidence = 0.7
  ): Promise<Tag[]> {
    const suggestions = await this.suggestTags(contactData)
    const appliedTags: Tag[] = []

    for (const suggestion of suggestions) {
      if (suggestion.confidence >= minConfidence) {
        // Check if tag exists, create if not
        let tag = await this.getBySlug(suggestion.slug)

        if (!tag) {
          tag = await this.create(
            {
              name: suggestion.tag_name,
              category: suggestion.category,
              color: suggestion.color,
              description: suggestion.reasoning
            },
            true,
            suggestion.reasoning
          )
        }

        // Add tag to contact
        await this.addTagToContact(contactId, tag.id, 'ai', suggestion.confidence)
        appliedTags.push(tag)
      }
    }

    return appliedTags
  }

  /**
   * Build AI prompt for tag suggestions
   */
  private buildTagSuggestionPrompt(contactData: any): string {
    return `Analyze this patient contact data and suggest 2-5 relevant tags.

Contact Data:
- Name: ${contactData.name}
- Source: ${contactData.source}
- Phone: ${contactData.phone || 'N/A'}
- Email: ${contactData.email || 'N/A'}
- Pipeline: ${contactData.current_pipeline || 'N/A'}
- Warmness Score: ${contactData.warmness_score || 'N/A'}/100
- Additional Data: ${JSON.stringify(contactData.data || {})}

Available Tag Categories:
- demographic: Age groups, gender, location
- behavioral: Engagement level, appointment history, response patterns
- priority: VIP, urgent, follow-up needed
- medical: Service interests, health conditions, risk levels
- channel: Source channels (Instagram, Facebook, referral, etc.)

Return ONLY valid JSON in this exact format:
{
  "tags": [
    {
      "tag_name": "Tag Name",
      "slug": "tag-slug",
      "category": "demographic|behavioral|priority|medical|channel",
      "reasoning": "Brief reason why this tag applies",
      "confidence": 0.85,
      "color": "#HEX"
    }
  ]
}

Be specific and relevant. Only suggest tags with high confidence (>0.6).`
  }

  /**
   * Parse AI response into tag suggestions
   */
  private parseAITagResponse(response: string): AITagSuggestion[] {
    try {
      // Extract JSON from response (AI might add extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      return parsed.tags || []
    } catch (error) {
      console.error('Failed to parse AI tag response:', error)
      return []
    }
  }

  /**
   * Generate URL-safe slug from tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  /**
   * Get default color for category
   */
  private getDefaultColorForCategory(category: string): string {
    const colors: Record<string, string> = {
      demographic: '#6B7280',
      behavioral: '#8B5CF6',
      priority: '#EF4444',
      medical: '#EC4899',
      channel: '#3B82F6',
      custom: '#10B981'
    }
    return colors[category] || '#6B7280'
  }
}
