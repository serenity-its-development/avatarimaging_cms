import { X, Phone, Mail, MessageSquare, Sparkles, Calendar, TrendingUp } from 'lucide-react'
import { Contact } from '../../lib/api'
import { Button, Badge, Avatar } from '../ui'
import { formatDate, formatRelativeTime } from '../../lib/utils'

interface ContactSidePanelProps {
  contact: Contact
  onClose: () => void
  onUpdate?: (data: Partial<Contact>) => void
}

export default function ContactSidePanel({ contact, onClose, onUpdate }: ContactSidePanelProps) {
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
