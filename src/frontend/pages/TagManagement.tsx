import { useState } from 'react'
import { Plus, Tag as TagIcon, Trash2, Sparkles, Loader2, Edit2 } from 'lucide-react'
import { useTags, useCreateTag, useDeleteTag, useUpdateTag } from '../hooks/useAPI'
import { Button, Badge, Card, CardContent, useConfirmDialog } from '../components/ui'

export default function TagManagement() {
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()
  const { data: tags, isLoading, refetch } = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()
  const updateTag = useUpdateTag()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [newTag, setNewTag] = useState({
    name: '',
    description: '',
    category: 'custom' as string,
    color: '#6B7280'
  })

  // AI-powered natural language tag creation
  const handleNLInput = (input: string) => {
    setNaturalLanguageInput(input)

    // Simple AI-like heuristics to suggest category and color
    const lower = input.toLowerCase()

    let suggestedCategory = 'custom'
    let suggestedColor = '#6B7280'
    let suggestedName = input
    let suggestedDescription = ''

    // Demographic patterns
    if (lower.includes('age') || lower.includes('senior') || lower.includes('young') || lower.includes('adult')) {
      suggestedCategory = 'demographic'
      suggestedColor = '#9CA3AF'
      suggestedDescription = 'Age-based demographic tag'
    }
    // Priority patterns
    else if (lower.includes('vip') || lower.includes('urgent') || lower.includes('important') || lower.includes('priority')) {
      suggestedCategory = 'priority'
      suggestedColor = '#EF4444'
      suggestedDescription = 'Priority level indicator'
    }
    // Behavioral patterns
    else if (lower.includes('engaged') || lower.includes('active') || lower.includes('responsive') || lower.includes('returning')) {
      suggestedCategory = 'behavioral'
      suggestedColor = '#8B5CF6'
      suggestedDescription = 'Behavioral characteristic'
    }
    // Medical patterns
    else if (lower.includes('screening') || lower.includes('scan') || lower.includes('test') || lower.includes('risk')) {
      suggestedCategory = 'medical'
      suggestedColor = '#EC4899'
      suggestedDescription = 'Medical service or condition tag'
    }
    // Channel patterns
    else if (lower.includes('instagram') || lower.includes('facebook') || lower.includes('referral') || lower.includes('website')) {
      suggestedCategory = 'channel'
      suggestedColor = '#3B82F6'
      suggestedDescription = 'Source channel tag'
    }

    setNewTag({
      name: suggestedName,
      description: suggestedDescription,
      category: suggestedCategory,
      color: suggestedColor
    })
  }

  const handleCreateTag = async () => {
    if (!newTag.name) return

    try {
      await createTag.mutateAsync(newTag)
      setShowCreateModal(false)
      setNaturalLanguageInput('')
      setNewTag({
        name: '',
        description: '',
        category: 'custom',
        color: '#6B7280'
      })
      refetch()
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleDeleteTag = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Tag',
      message: 'Are you sure you want to delete this tag? This will remove it from all contacts.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      await deleteTag.mutateAsync(id)
      refetch()
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const categoryColors: Record<string, string> = {
    demographic: 'bg-gray-100 text-gray-700',
    behavioral: 'bg-purple-100 text-purple-700',
    priority: 'bg-red-100 text-red-700',
    medical: 'bg-pink-100 text-pink-700',
    channel: 'bg-blue-100 text-blue-700',
    custom: 'bg-green-100 text-green-700'
  }

  // Group tags by category
  const groupedTags = tags?.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = []
    }
    acc[tag.category].push(tag)
    return acc
  }, {} as Record<string, typeof tags>)

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
          <h1 className="text-2xl font-bold text-gray-900">Tag Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and organize tags for contact segmentation
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{tags?.length || 0}</div>
            <div className="text-sm text-gray-500">Total Tags</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-ai-600">
              {tags?.filter(t => t.is_ai_generated).length || 0}
            </div>
            <div className="text-sm text-gray-500">AI Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary-600">
              {tags?.reduce((sum, t) => sum + t.usage_count, 0) || 0}
            </div>
            <div className="text-sm text-gray-500">Total Usage</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success-600">
              {Object.keys(groupedTags || {}).length}
            </div>
            <div className="text-sm text-gray-500">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Tags by Category */}
      <div className="space-y-6">
        {Object.entries(groupedTags || {}).map(([category, categoryTags]) => (
          <div key={category}>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 capitalize flex items-center gap-2">
              <span>{category}</span>
              <Badge variant="default" size="sm">{categoryTags.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTags.map((tag) => (
                <Card key={tag.id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          />
                          <h3 className="font-medium text-gray-900">{tag.name}</h3>
                          {tag.is_ai_generated && (
                            <Sparkles className="w-4 h-4 text-ai-600" />
                          )}
                        </div>
                        {tag.description && (
                          <p className="text-xs text-gray-500 mb-2">{tag.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="default" size="sm">
                            {tag.usage_count} uses
                          </Badge>
                          <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[tag.category]}`}>
                            {tag.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1.5 hover:bg-danger-50 rounded text-gray-400 hover:text-danger-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-bold text-gray-900">Create New Tag</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Natural Language Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-ai-600" />
                    Describe the tag (AI will suggest details)
                  </label>
                  <textarea
                    value={naturalLanguageInput}
                    onChange={(e) => handleNLInput(e.target.value)}
                    placeholder="e.g., 'VIP patients over 65', 'Instagram leads needing follow-up', 'High-risk breast screening'..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type naturally - AI will auto-fill the details below
                  </p>
                </div>

                {/* Tag Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., VIP Patient"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newTag.description}
                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Brief description"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newTag.category}
                    onChange={(e) => setNewTag({ ...newTag, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="demographic">Demographic</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="priority">Priority</option>
                    <option value="medical">Medical/Service</option>
                    <option value="channel">Source Channel</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTag.color}
                      onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newTag.color}
                      onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="#6B7280"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <div
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border"
                    style={{
                      backgroundColor: `${newTag.color}15`,
                      borderColor: newTag.color,
                      color: newTag.color
                    }}
                  >
                    {newTag.name || 'Tag Name'}
                  </div>
                </div>

                {/* Actions */}
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
                    onClick={handleCreateTag}
                    className="flex-1"
                    disabled={createTag.isPending || !newTag.name}
                  >
                    {createTag.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Tag'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog />
    </div>
  )
}
