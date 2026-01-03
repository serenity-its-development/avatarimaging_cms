import { X, Phone, Mail, MessageSquare, Sparkles, Calendar, TrendingUp, Tag, Plus, Loader2, CheckCircle2, Clock, AlertCircle, Users, UserPlus } from 'lucide-react'
import { Contact } from '../../lib/api'
import { Button, Badge, Avatar } from '../ui'
import { formatDate, formatRelativeTime } from '../../lib/utils'
import { useState } from 'react'
import { useContactTags, useTags, useAddTagToContact, useRemoveTagFromContact, useAutoTagContact, useContactTasks, useContactStaffAssignments, useStaff, useAssignStaff, useUnassignStaff, useSuggestStaff } from '../../hooks/useAPI'

interface ContactSidePanelProps {
  contact: Contact
  onClose: () => void
  onUpdate?: (data: Partial<Contact>) => void
}

export default function ContactSidePanel({ contact, onClose, onUpdate }: ContactSidePanelProps) {
  const [showAddTag, setShowAddTag] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [showAssignStaff, setShowAssignStaff] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'primary' | 'secondary' | 'consultant' | 'specialist' | 'support'>('primary')

  // Fetch tags
  const { data: contactTags, refetch: refetchContactTags } = useContactTags(contact.id)
  const { data: allTags } = useTags()
  const addTagToContact = useAddTagToContact()
  const removeTagFromContact = useRemoveTagFromContact()
  const autoTagContact = useAutoTagContact()

  // Fetch tasks
  const { data: allTasks } = useContactTasks(contact.id)

  // Filter to show only pending/in_progress tasks
  const pendingTasks = allTasks?.filter(
    task => task.status === 'pending' || task.status === 'in_progress'
  ) || []

  // Fetch staff
  const { data: staffAssignments, refetch: refetchStaffAssignments } = useContactStaffAssignments(contact.id)
  const { data: allStaff } = useStaff({ canBeAssigned: true })
  const assignStaff = useAssignStaff()
  const unassignStaff = useUnassignStaff()
  const suggestStaff = useSuggestStaff()

  // Filter out already assigned staff
  const availableStaff = allStaff?.filter(
    staff => !staffAssignments?.some(sa => sa.staff_id === staff.id)
  ) || []

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

  const handleAssignStaff = async () => {
    if (!selectedStaffId) return
    try {
      await assignStaff.mutateAsync({
        contact_id: contact.id,
        staff_id: selectedStaffId,
        assignment_type: assignmentType,
        assigned_by: 'staff', // TODO: Use actual user ID
      })
      setShowAssignStaff(false)
      setSelectedStaffId('')
      refetchStaffAssignments()
    } catch (error) {
      console.error('Failed to assign staff:', error)
    }
  }

  const handleUnassignStaff = async (staffId: string) => {
    try {
      await unassignStaff.mutateAsync({
        contactId: contact.id,
        staffId
      })
      refetchStaffAssignments()
    } catch (error) {
      console.error('Failed to unassign staff:', error)
    }
  }

  const handleAIStaffSuggest = async () => {
    try {
      const suggestions = await suggestStaff.mutateAsync({
        contactData: {
          name: contact.name,
          current_pipeline: contact.current_pipeline,
          current_stage: contact.current_stage,
          source: contact.source,
          data: contact.data
        },
        assignmentType
      })

      if (suggestions.length > 0) {
        // Auto-select the top suggestion
        setSelectedStaffId(suggestions[0].staff_id)
      }
    } catch (error) {
      console.error('Failed to get AI staff suggestions:', error)
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-danger-600 bg-danger-50 border-danger-200'
      case 'high': return 'text-warning-600 bg-warning-50 border-warning-200'
      case 'medium': return 'text-primary-600 bg-primary-50 border-primary-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="w-4 h-4" />
    }
    return <Clock className="w-4 h-4" />
  }

  const isOverdue = (dueDate?: number) => {
    if (!dueDate) return false
    return dueDate < Date.now()
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

        {/* Staff Assignments Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Assigned Staff</h3>
              {staffAssignments && staffAssignments.length > 0 && (
                <Badge variant="primary" size="sm">{staffAssignments.length}</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowAssignStaff(!showAssignStaff)}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Assign staff"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={handleAIStaffSuggest}
                disabled={suggestStaff.isPending}
                className="p-1.5 hover:bg-ai-50 rounded text-ai-600 hover:text-ai-700 transition-colors disabled:opacity-50"
                title="AI staff suggestion"
              >
                {suggestStaff.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Assign Staff Dropdown */}
          {showAssignStaff && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <select
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="primary">Primary Contact</option>
                <option value="secondary">Secondary Contact</option>
                <option value="consultant">Consultant</option>
                <option value="specialist">Specialist</option>
                <option value="support">Support</option>
              </select>

              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="">Select a staff member...</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} - {staff.role?.name} ({staff.current_workload}/{staff.workload_capacity})
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAssignStaff(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAssignStaff}
                  disabled={!selectedStaffId || assignStaff.isPending}
                >
                  {assignStaff.isPending ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          )}

          {/* Staff Assignments List */}
          <div className="space-y-2">
            {staffAssignments && staffAssignments.length > 0 ? (
              staffAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar
                        size="sm"
                        src={assignment.staff?.avatar_url}
                        fallback={assignment.staff ? `${assignment.staff.first_name} ${assignment.staff.last_name}` : '?'}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {assignment.staff?.first_name} {assignment.staff?.last_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="secondary"
                            size="sm"
                            style={{ backgroundColor: assignment.staff?.role?.color ? `${assignment.staff.role.color}20` : undefined }}
                          >
                            {assignment.staff?.role?.name || 'Unknown'}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {assignment.assignment_type}
                          </Badge>
                        </div>
                        {assignment.staff && assignment.staff.specialties.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {assignment.staff.specialties.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassignStaff(assignment.staff_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No staff assigned yet</p>
                <p className="text-xs text-gray-400 mt-1">Assign team members to this contact</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Pending Tasks</h3>
              {pendingTasks.length > 0 && (
                <Badge variant="primary" size="sm">{pendingTasks.length}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-600"
              onClick={() => {
                // TODO: Open create task modal
                console.log('Create task for:', contact.id)
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(task.priority)} transition-colors hover:shadow-sm cursor-pointer`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getPriorityIcon(task.priority)}
                      <span className="font-medium text-sm">{task.title}</span>
                    </div>
                    <Badge
                      variant={task.status === 'in_progress' ? 'warning' : 'secondary'}
                      size="sm"
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-600 mb-2 pl-6">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs pl-6">
                    <div className="flex items-center gap-3">
                      {task.due_date && (
                        <span className={isOverdue(task.due_date) ? 'text-danger-600 font-medium' : 'text-gray-500'}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {isOverdue(task.due_date) ? 'Overdue: ' : 'Due: '}
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      <span className="text-gray-500 capitalize">
                        {task.task_type || task.type}
                      </span>
                    </div>
                    {task.priority && (
                      <Badge
                        variant={
                          task.priority === 'urgent' ? 'danger' :
                          task.priority === 'high' ? 'warning' :
                          task.priority === 'medium' ? 'primary' : 'secondary'
                        }
                        size="sm"
                      >
                        {task.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                <CheckCircle2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending tasks</p>
                <p className="text-xs text-gray-400 mt-1">All tasks for this contact are complete!</p>
              </div>
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
