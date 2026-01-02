/**
 * PipelineService - Business logic for pipeline and stage management
 * Handles CRUD operations for customizable pipelines
 */

import type { DatabaseGateway } from '../gateway/DatabaseGateway'
import { ulid } from 'ulid'

export interface Pipeline {
  id: string
  name: string
  description?: string
  color?: string
  is_active: boolean
  is_default: boolean
  display_order: number
  created_at: number
  updated_at: number
  stages?: PipelineStage[]
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  key: string
  description?: string
  color?: string
  display_order: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface CreatePipelineInput {
  name: string
  description?: string
  color?: string
  stages: Array<{
    name: string
    key: string
    description?: string
    color?: string
  }>
}

export interface UpdatePipelineInput {
  name?: string
  description?: string
  color?: string
  is_active?: boolean
  is_default?: boolean
  display_order?: number
}

export interface UpdateStageInput {
  name?: string
  key?: string
  description?: string
  color?: string
  display_order?: number
  is_active?: boolean
}

export interface ReorderStagesInput {
  stage_id: string
  new_order: number
}

export class PipelineService {
  constructor(private db: DatabaseGateway) {}

  /**
   * Get all pipelines with their stages
   */
  async listAll(includeInactive = false): Promise<Pipeline[]> {
    const query = includeInactive
      ? 'SELECT * FROM pipelines ORDER BY display_order, created_at'
      : 'SELECT * FROM pipelines WHERE is_active = 1 ORDER BY display_order, created_at'

    const pipelines = await this.db.raw<Pipeline[]>(query)

    // Load stages for each pipeline
    for (const pipeline of pipelines) {
      const stages = await this.db.raw<PipelineStage[]>(
        'SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY display_order',
        [pipeline.id]
      )
      pipeline.stages = stages
    }

    return pipelines
  }

  /**
   * Get a single pipeline by ID with stages
   */
  async getById(id: string): Promise<Pipeline | null> {
    const pipelines = await this.db.raw<Pipeline[]>(
      'SELECT * FROM pipelines WHERE id = ?',
      [id]
    )

    if (pipelines.length === 0) return null

    const pipeline = pipelines[0]
    const stages = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY display_order',
      [pipeline.id]
    )
    pipeline.stages = stages

    return pipeline
  }

  /**
   * Get default pipeline
   */
  async getDefault(): Promise<Pipeline | null> {
    const pipelines = await this.db.raw<Pipeline[]>(
      'SELECT * FROM pipelines WHERE is_default = 1 LIMIT 1'
    )

    if (pipelines.length === 0) return null

    const pipeline = pipelines[0]
    const stages = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY display_order',
      [pipeline.id]
    )
    pipeline.stages = stages

    return pipeline
  }

  /**
   * Create new pipeline with stages
   */
  async create(input: CreatePipelineInput): Promise<Pipeline> {
    const now = Date.now()
    const pipelineId = `pipeline_${ulid()}`

    // Get max display order
    const maxOrderResult = await this.db.raw<Array<{ max_order: number | null }>>(
      'SELECT MAX(display_order) as max_order FROM pipelines'
    )
    const displayOrder = (maxOrderResult[0]?.max_order ?? -1) + 1

    // Create pipeline
    await this.db.raw(
      `INSERT INTO pipelines (id, name, description, color, is_active, is_default, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pipelineId,
        input.name,
        input.description || null,
        input.color || null,
        true,
        false,
        displayOrder,
        now,
        now
      ]
    )

    // Create stages
    for (let i = 0; i < input.stages.length; i++) {
      const stage = input.stages[i]
      const stageId = `stage_${ulid()}`

      await this.db.raw(
        `INSERT INTO pipeline_stages (id, pipeline_id, name, key, description, color, display_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stageId,
          pipelineId,
          stage.name,
          stage.key,
          stage.description || null,
          stage.color || null,
          i,
          true,
          now,
          now
        ]
      )
    }

    // Return created pipeline
    const created = await this.getById(pipelineId)
    if (!created) throw new Error('Failed to create pipeline')
    return created
  }

  /**
   * Update pipeline
   */
  async update(id: string, input: UpdatePipelineInput): Promise<Pipeline> {
    const now = Date.now()
    const sets: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      sets.push('name = ?')
      values.push(input.name)
    }
    if (input.description !== undefined) {
      sets.push('description = ?')
      values.push(input.description)
    }
    if (input.color !== undefined) {
      sets.push('color = ?')
      values.push(input.color)
    }
    if (input.is_active !== undefined) {
      sets.push('is_active = ?')
      values.push(input.is_active ? 1 : 0)
    }
    if (input.display_order !== undefined) {
      sets.push('display_order = ?')
      values.push(input.display_order)
    }
    if (input.is_default !== undefined) {
      // If setting as default, unset all others first
      if (input.is_default) {
        await this.db.raw('UPDATE pipelines SET is_default = 0')
      }
      sets.push('is_default = ?')
      values.push(input.is_default ? 1 : 0)
    }

    sets.push('updated_at = ?')
    values.push(now)
    values.push(id)

    await this.db.raw(
      `UPDATE pipelines SET ${sets.join(', ')} WHERE id = ?`,
      values
    )

    const updated = await this.getById(id)
    if (!updated) throw new Error('Pipeline not found')
    return updated
  }

  /**
   * Delete pipeline (soft delete by setting is_active = false)
   */
  async delete(id: string): Promise<void> {
    // Check if it's the default pipeline
    const pipeline = await this.getById(id)
    if (pipeline?.is_default) {
      throw new Error('Cannot delete the default pipeline')
    }

    await this.db.raw(
      'UPDATE pipelines SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    )
  }

  /**
   * Hard delete pipeline (use with caution)
   */
  async hardDelete(id: string): Promise<void> {
    // Check if it's the default pipeline
    const pipeline = await this.getById(id)
    if (pipeline?.is_default) {
      throw new Error('Cannot delete the default pipeline')
    }

    // Check if any contacts are using this pipeline
    const contacts = await this.db.raw<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM contacts WHERE current_pipeline = ?',
      [id]
    )

    if (contacts[0].count > 0) {
      throw new Error(
        `Cannot delete pipeline with ${contacts[0].count} contacts. Move contacts to another pipeline first.`
      )
    }

    // Delete stages first (cascade)
    await this.db.raw('DELETE FROM pipeline_stages WHERE pipeline_id = ?', [id])
    // Delete pipeline
    await this.db.raw('DELETE FROM pipelines WHERE id = ?', [id])
  }

  /**
   * Create new stage in pipeline
   */
  async createStage(pipelineId: string, input: Omit<UpdateStageInput, 'display_order'> & { name: string; key: string }): Promise<PipelineStage> {
    const now = Date.now()
    const stageId = `stage_${ulid()}`

    // Get max display order for this pipeline
    const maxOrderResult = await this.db.raw<Array<{ max_order: number | null }>>(
      'SELECT MAX(display_order) as max_order FROM pipeline_stages WHERE pipeline_id = ?',
      [pipelineId]
    )
    const displayOrder = (maxOrderResult[0]?.max_order ?? -1) + 1

    await this.db.raw(
      `INSERT INTO pipeline_stages (id, pipeline_id, name, key, description, color, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stageId,
        pipelineId,
        input.name,
        input.key,
        input.description || null,
        input.color || null,
        displayOrder,
        true,
        now,
        now
      ]
    )

    const stages = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE id = ?',
      [stageId]
    )

    return stages[0]
  }

  /**
   * Update stage
   */
  async updateStage(stageId: string, input: UpdateStageInput): Promise<PipelineStage> {
    const now = Date.now()
    const sets: string[] = []
    const values: any[] = []

    if (input.name !== undefined) {
      sets.push('name = ?')
      values.push(input.name)
    }
    if (input.key !== undefined) {
      sets.push('key = ?')
      values.push(input.key)
    }
    if (input.description !== undefined) {
      sets.push('description = ?')
      values.push(input.description)
    }
    if (input.color !== undefined) {
      sets.push('color = ?')
      values.push(input.color)
    }
    if (input.display_order !== undefined) {
      sets.push('display_order = ?')
      values.push(input.display_order)
    }
    if (input.is_active !== undefined) {
      sets.push('is_active = ?')
      values.push(input.is_active ? 1 : 0)
    }

    sets.push('updated_at = ?')
    values.push(now)
    values.push(stageId)

    await this.db.raw(
      `UPDATE pipeline_stages SET ${sets.join(', ')} WHERE id = ?`,
      values
    )

    const stages = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE id = ?',
      [stageId]
    )

    return stages[0]
  }

  /**
   * Delete stage
   */
  async deleteStage(stageId: string): Promise<void> {
    // Check if any contacts are in this stage
    const stage = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE id = ?',
      [stageId]
    )

    if (stage.length === 0) {
      throw new Error('Stage not found')
    }

    const contacts = await this.db.raw<Array<{ count: number }>>(
      'SELECT COUNT(*) as count FROM contacts WHERE current_stage = ?',
      [stage[0].key]
    )

    if (contacts[0].count > 0) {
      throw new Error(
        `Cannot delete stage with ${contacts[0].count} contacts. Move contacts to another stage first.`
      )
    }

    await this.db.raw('DELETE FROM pipeline_stages WHERE id = ?', [stageId])
  }

  /**
   * Reorder stages within a pipeline
   */
  async reorderStages(pipelineId: string, reorders: ReorderStagesInput[]): Promise<PipelineStage[]> {
    const now = Date.now()

    for (const { stage_id, new_order } of reorders) {
      await this.db.raw(
        'UPDATE pipeline_stages SET display_order = ?, updated_at = ? WHERE id = ? AND pipeline_id = ?',
        [new_order, now, stage_id, pipelineId]
      )
    }

    const stages = await this.db.raw<PipelineStage[]>(
      'SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY display_order',
      [pipelineId]
    )

    return stages
  }
}
