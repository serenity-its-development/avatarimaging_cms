import { useState } from 'react'
import { Plus, Search, Mail, MessageSquare, Share2, Brain, Bell, Copy, Edit2, Trash2, Zap, Star } from 'lucide-react'
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useDuplicateTemplate } from '../hooks/useAPI'
import { Template, CreateTemplateInput } from '../lib/api'
import { Button, Badge, Toast, useConfirmDialog } from '../components/ui'

const CATEGORIES = [
  { value: 'all', label: 'All Templates', icon: Star },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'social', label: 'Social Media', icon: Share2 },
  { value: 'ai_context', label: 'AI Context', icon: Brain },
  { value: 'notification', label: 'Notifications', icon: Bell },
]

export default function TemplatesPage() {
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success')

  // Fetch templates
  const { data: templates, isLoading, error, refetch } = useTemplates({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    active_only: true,
    search: searchQuery || undefined,
  })

  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const duplicateTemplate = useDuplicateTemplate()

  const [newTemplate, setNewTemplate] = useState<CreateTemplateInput>({
    name: '',
    category: 'sms',
    body: '',
    description: '',
    subject: '',
    variables: [],
    quick_button_label: '',
    quick_button_icon: '',
  })

  // Handle create template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTemplate.mutateAsync(newTemplate)
      setToastMessage('Template created successfully')
      setToastVariant('success')
      setShowToast(true)
      setShowCreateModal(false)
      resetNewTemplate()
      refetch()
    } catch (error) {
      setToastMessage('Failed to create template')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle update template
  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return
    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        data: {
          name: editingTemplate.name,
          description: editingTemplate.description,
          category: editingTemplate.category,
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          variables: editingTemplate.variables,
          quick_button_label: editingTemplate.quick_button_label,
          quick_button_icon: editingTemplate.quick_button_icon,
          ai_system_prompt: editingTemplate.ai_system_prompt,
          ai_temperature: editingTemplate.ai_temperature,
          ai_max_tokens: editingTemplate.ai_max_tokens,
        },
      })
      setToastMessage('Template updated successfully')
      setToastVariant('success')
      setShowToast(true)
      setEditingTemplate(null)
      refetch()
    } catch (error) {
      setToastMessage('Failed to update template')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle delete template
  const handleDeleteTemplate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      await deleteTemplate.mutateAsync(id)
      setToastMessage('Template deleted successfully')
      setToastVariant('success')
      setShowToast(true)
      refetch()
    } catch (error) {
      setToastMessage('Failed to delete template')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle duplicate template
  const handleDuplicateTemplate = async (template: Template) => {
    const newName = prompt('Enter new template name:', `${template.name} (Copy)`)
    if (!newName) return
    try {
      await duplicateTemplate.mutateAsync({ templateId: template.id, newName })
      setToastMessage('Template duplicated successfully')
      setToastVariant('success')
      setShowToast(true)
      refetch()
    } catch (error) {
      setToastMessage('Failed to duplicate template')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      category: 'sms',
      body: '',
      description: '',
      subject: '',
      variables: [],
      quick_button_label: '',
      quick_button_icon: '',
    })
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat ? cat.icon : Star
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      email: 'blue',
      sms: 'green',
      social: 'purple',
      ai_context: 'amber',
      notification: 'red',
    }
    return colors[category] || 'gray'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-600 mt-1">Manage message templates for emails, SMS, social, and AI contexts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === cat.value
                  ? 'bg-primary-50 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
              {cat.value !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {templates?.filter(t => t.category === cat.value).length || 0}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">Failed to load templates</div>
      ) : !templates?.length ? (
        <div className="text-center py-12 text-gray-500">
          No templates found. Create your first template!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = getCategoryIcon(template.category)
            const color = getCategoryColor(template.category)

            return (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-${color}-100`}>
                      <Icon className={`w-4 h-4 text-${color}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-xs text-gray-500">{template.description}</p>
                      )}
                    </div>
                  </div>
                  {template.is_default && (
                    <Badge variant="primary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>

                {/* Body Preview */}
                <div className="mb-3">
                  {template.subject && (
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Subject: {template.subject.substring(0, 50)}
                      {template.subject.length > 50 ? '...' : ''}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3">{template.body}</p>
                </div>

                {/* Variables */}
                {template.variables && template.variables.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((v) => (
                        <code key={v} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {`{{${v}}}`}
                        </code>
                      ))}
                      {template.variables.length > 3 && (
                        <span className="text-xs text-gray-500">+{template.variables.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Button */}
                {template.quick_button_label && (
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Quick Action: {template.quick_button_label}
                    </Badge>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>Used {template.use_count} times</span>
                  {template.last_used_at && (
                    <span>Last used {new Date(template.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate || undefined}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTemplate(null)
          }}
          onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
          formData={editingTemplate || newTemplate}
          setFormData={editingTemplate ? setEditingTemplate : setNewTemplate}
          isLoading={editingTemplate ? updateTemplate.isPending : createTemplate.isPending}
        />
      )}

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  )
}

// Template Modal Component
function TemplateModal({
  template,
  onClose,
  onSave,
  formData,
  setFormData,
  isLoading,
}: {
  template?: Template
  onClose: () => void
  onSave: (e: React.FormEvent) => void
  formData: any
  setFormData: (data: any) => void
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4">
          {/* Name & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template"
            />
          </div>

          {/* Subject (Email only) */}
          {formData.category === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Appointment Confirmation - {{appointment_date}}"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Body *
            </label>
            <textarea
              required
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Use {{variable_name}} for dynamic content"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use double curly braces for variables: {'{{'} contact_name {'}}'}
            </p>
          </div>

          {/* AI Settings (AI Context only) */}
          {formData.category === 'ai_context' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI System Prompt
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  value={formData.ai_system_prompt || ''}
                  onChange={(e) => setFormData({ ...formData, ai_system_prompt: e.target.value })}
                  placeholder="Define the AI's role and behavior..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature (0-1)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.ai_temperature || 0.7}
                    onChange={(e) => setFormData({ ...formData, ai_temperature: parseFloat(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.ai_max_tokens || 256}
                    onChange={(e) => setFormData({ ...formData, ai_max_tokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Quick Action Button */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Button Label
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.quick_button_label || ''}
                onChange={(e) => setFormData({ ...formData, quick_button_label: e.target.value })}
                placeholder="e.g., Send Reminder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button Icon
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.quick_button_icon || ''}
                onChange={(e) => setFormData({ ...formData, quick_button_icon: e.target.value })}
                placeholder="e.g., bell, mail, zap"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog />
    </div>
  )
}
