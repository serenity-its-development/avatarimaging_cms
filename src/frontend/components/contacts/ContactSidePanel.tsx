import { X, Phone, Mail, MessageSquare, Sparkles, Calendar, TrendingUp, Tag, Plus, Loader2 } from 'lucide-react'
import { Contact } from '../../lib/api'
import { Button, Badge, Avatar } from '../ui'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { useState } from 'react'
import { useContactTags, useTags, useAddTagToContact, useRemoveTagFromContact, useAutoTagContact } from '../../hooks/useAPI'

interface ContactSidePanelProps {
  contact: Contact
  onClose: () => void
  onUpdate?: (data: Partial<Contact>) => void
}

export default function ContactSidePanel({ contact, onClose, onUpdate }: ContactSidePanelProps) {
  const [showAddTag, setShowAddTag] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')

  // Fetch tags
  const { data: contactTags, refetch: refetchContactTags } = useContactTags(contact.id)
  const { data: allTags } = useTags()
  const addTagToContact = useAddTagToContact()
  const removeTagFromContact = useRemoveTagFromContact()
  const autoTagContact = useAutoTagContact()

  // Filter out already applied tags
  const availableTags = allTags?.filter(
    tag => !contactTags?.some(ct => ct.tag_id === tag.id)
  ) || []

  const handleAddTag = async () => {
    if (!selectedTagId) return
    try {
      await addTagToContact.mutateAsync({
        contactId: contact.id,
        tagId: selectedTagId,
        addedBy: 'staff'
      })
      setShowAddTag(false)
      setSelectedTagId('')
      refetchContactTags()
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromContact.mutateAsync({
        contactId: contact.id,
        tagId
      })
      refetchContactTags()
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const handleAutoTag = async () => {
    try {
      await autoTagContact.mutateAsync({
        contactId: contact.id,
        contactData: {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          source: contact.source,
          current_pipeline: contact.current_pipeline,
          warmness_score: contact.warmness_score,
          data: contact.data
        },
        minConfidence: 0.7
      })
      refetchContactTags()
    } catch (error) {
      console.error('Failed to auto-tag:', error)
    }
  }

  const getWarmnessColor = (score?: number) => {
    if (!score) return 'text-gray-600'
    if (score >= 80) return 'text-danger-600'
    if (score >= 60) return 'text-warning-600'
    return 'text-primary-600'
  }

  const getWarmnessLabel = (score?: number) => {
    if (!score) return 'Unknown'
    if (score >= 80) return 'Hot'
    if (score >= 60) return 'Warm'
    if (score >= 40) return 'Cool'
    return 'Cold'
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-gray-200 shadow-soft-xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50">
        <div className="flex items-center gap-3">
          <Avatar size="lg" fallback={contact.name} />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
            <p className="text-sm text-gray-500">{contact.source}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Quick Actions */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <Button size="sm" variant="primary" className="flex-1">
              <Phone className="w-4 h-4" />
              Call
            </Button>
            <Button size="sm" variant="secondary" className="flex-1">
              <MessageSquare className="w-4 h-4" />
              SMS
            </Button>
            <Button size="sm" variant="secondary" className="flex-1">
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>
        </div>

        {/* AI Warmness Score */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-600" />
              <h3 className="font-semibold text-gray-900">AI Warmness Score</h3>
            </div>
            <span className={`text-2xl font-bold ${getWarmnessColor(contact.warmness_score)}`}>
              {contact.warmness_score || 0}/100
            </span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all ${
                (contact.warmness_score || 0) >= 80 ? 'bg-danger-500' :
                (contact.warmness_score || 0) >= 60 ? 'bg-warning-500' :
                'bg-primary-500'
              }`}
              style={{ width: `${contact.warmness_score || 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Cold</span>
            <span className="font-medium">{getWarmnessLabel(contact.warmness_score)}</span>
            <span>Hot</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="w-full mt-3 text-ai-600"
            onClick={() => {
              // TODO: Trigger AI recalculation
              console.log('Recalculate warmness for:', contact.id)
            }}
          >
            <Sparkles className="w-4 h-4" />
            Recalculate with AI
          </Button>
        </div>

        {/* Contact Details */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-3">
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{contact.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Pipeline Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pipeline</span>
              <Badge variant="primary" size="sm">{contact.current_pipeline}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stage</span>
              <Badge variant="success" size="sm">{contact.current_stage}</Badge>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Tags</h3>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowAddTag(!showAddTag)}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Add tag"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleAutoTag}
                disabled={autoTagContact.isPending}
                className="p-1.5 hover:bg-ai-50 rounded text-ai-600 hover:text-ai-700 transition-colors disabled:opacity-50"
                title="AI auto-tag"
              >
                {autoTagContact.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Add Tag Dropdown */}
          {showAddTag && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm mb-2"
              >
                <option value="">Select a tag...</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} ({tag.category})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddTag(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddTag}
                  disabled={!selectedTagId || addTagToContact.isPending}
                >
                  {addTagToContact.isPending ? 'Adding...' : 'Add Tag'}
                </Button>
              </div>
            </div>
          )}

          {/* Tags List */}
          <div className="flex flex-wrap gap-2">
            {contactTags && contactTags.length > 0 ? (
              contactTags.map((ct) => (
                <div
                  key={ct.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border group hover:border-gray-400 transition-colors"
                  style={{
                    backgroundColor: ct.tag?.color ? `${ct.tag.color}15` : '#F3F4F6',
                    borderColor: ct.tag?.color || '#D1D5DB',
                    color: ct.tag?.color || '#6B7280'
                  }}
                >
                  <span>{ct.tag?.name}</span>
                  {ct.tag?.is_ai_generated && (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <button
                    onClick={() => handleRemoveTag(ct.tag_id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-full p-0.5 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No tags yet. Add tags to categorize this contact.</p>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="px-6 py-4">
          <h3 className="font-semibold text-gray-900 mb-3">Activity Timeline</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Contact Created</p>
                <p className="text-xs text-gray-500">{formatRelativeTime(contact.created_at)}</p>
              </div>
            </div>

            {/* TODO: Add more timeline events from touchpoints */}
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">More activity coming soon...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            Edit Details
          </Button>
          <Button variant="danger" size="sm" className="flex-1">
            Delete Contact
          </Button>
        </div>
      </div>
    </div>
  )
}
