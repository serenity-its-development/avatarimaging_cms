import { useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Check, X, Loader2 } from 'lucide-react'
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages
} from '../hooks/useAPI'
import { Pipeline, PipelineStage } from '../lib/api'
import { Button, Card, CardContent, Badge } from '../components/ui'

export default function PipelineSettings() {
  const { data: pipelines, isLoading, refetch } = usePipelines()
  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const deletePipeline = useDeletePipeline()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const reorderStages = useReorderStages()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null)

  const [newPipeline, setNewPipeline] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    stages: [
      { name: 'Stage 1', key: 'stage_1', color: '#8B5CF6' },
      { name: 'Stage 2', key: 'stage_2', color: '#3B82F6' },
    ]
  })

  const handleCreatePipeline = async () => {
    try {
      await createPipeline.mutateAsync(newPipeline)
      setShowCreateModal(false)
      setNewPipeline({
        name: '',
        description: '',
        color: '#3B82F6',
        stages: [
          { name: 'Stage 1', key: 'stage_1', color: '#8B5CF6' },
          { name: 'Stage 2', key: 'stage_2', color: '#3B82F6' },
        ]
      })
      refetch()
    } catch (error) {
      console.error('Failed to create pipeline:', error)
      alert('Failed to create pipeline')
    }
  }

  const handleSetDefault = async (pipelineId: string) => {
    try {
      await updatePipeline.mutateAsync({
        id: pipelineId,
        data: { is_default: true }
      })
      refetch()
    } catch (error) {
      console.error('Failed to set default:', error)
      alert('Failed to set as default pipeline')
    }
  }

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return

    try {
      await deletePipeline.mutateAsync(pipelineId)
      refetch()
    } catch (error) {
      console.error('Failed to delete pipeline:', error)
      alert('Failed to delete pipeline. Make sure no contacts are using it.')
    }
  }

  const addStage = (index: number) => {
    const newStages = [...newPipeline.stages]
    newStages.splice(index + 1, 0, {
      name: `Stage ${newStages.length + 1}`,
      key: `stage_${newStages.length + 1}`,
      color: '#6B7280'
    })
    setNewPipeline({ ...newPipeline, stages: newStages })
  }

  const removeStage = (index: number) => {
    const newStages = newPipeline.stages.filter((_, i) => i !== index)
    setNewPipeline({ ...newPipeline, stages: newStages })
  }

  const updateStageField = (index: number, field: string, value: string) => {
    const newStages = [...newPipeline.stages]
    newStages[index] = { ...newStages[index], [field]: value }
    setNewPipeline({ ...newPipeline, stages: newStages })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and customize your sales pipelines and stages
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Pipeline
        </Button>
      </div>

      {/* Pipelines List */}
      <div className="space-y-4">
        {pipelines?.map((pipeline) => (
          <Card key={pipeline.id} hover className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: pipeline.color || '#6B7280' }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{pipeline.name}</h3>
                      {pipeline.description && (
                        <p className="text-sm text-gray-500">{pipeline.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pipeline.is_default && (
                      <Badge variant="primary" size="sm">
                        Default
                      </Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {pipeline.stages?.length || 0} stages
                    </span>
                    {!pipeline.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(pipeline.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedPipeline(
                        expandedPipeline === pipeline.id ? null : pipeline.id
                      )}
                    >
                      {expandedPipeline === pipeline.id ? 'Hide' : 'View'} Stages
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePipeline(pipeline.id)}
                      disabled={pipeline.is_default}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stages */}
              {expandedPipeline === pipeline.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Stages</h4>
                  <div className="space-y-2">
                    {pipeline.stages
                      ?.sort((a, b) => a.display_order - b.display_order)
                      .map((stage, index) => (
                        <div
                          key={stage.id}
                          className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color || '#6B7280' }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {stage.name}
                            </div>
                            <div className="text-xs text-gray-500">Key: {stage.key}</div>
                          </div>
                          <Badge variant="default" size="sm">
                            Order: {index + 1}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Pipeline</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPipeline.name}
                    onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Lead to Booking"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newPipeline.description}
                    onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Brief description of this pipeline"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newPipeline.color}
                      onChange={(e) => setNewPipeline({ ...newPipeline, color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newPipeline.color}
                      onChange={(e) => setNewPipeline({ ...newPipeline, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Stages *
                    </label>
                    <button
                      onClick={() => addStage(newPipeline.stages.length - 1)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Stage
                    </button>
                  </div>

                  <div className="space-y-2">
                    {newPipeline.stages.map((stage, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <input
                          type="color"
                          value={stage.color}
                          onChange={(e) => updateStageField(index, 'color', e.target.value)}
                          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => updateStageField(index, 'name', e.target.value)}
                            placeholder="Stage Name"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          />
                          <input
                            type="text"
                            value={stage.key}
                            onChange={(e) => updateStageField(index, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            placeholder="stage_key"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
                          />
                        </div>
                        {newPipeline.stages.length > 2 && (
                          <button
                            onClick={() => removeStage(index)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePipeline}
                    className="flex-1"
                    disabled={createPipeline.isPending || !newPipeline.name || newPipeline.stages.length < 2}
                  >
                    {createPipeline.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Pipeline'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
