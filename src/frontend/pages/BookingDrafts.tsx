import { useState } from 'react'
import { Clock, CheckCircle, XCircle, Calendar, User, MessageSquare, Brain, AlertCircle } from 'lucide-react'
import { useBookingDrafts, useApproveDraft, useRejectDraft } from '../hooks/useAPI'
import { Button, Badge, Toast } from '../components/ui'

export default function BookingDrafts() {
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success')
  const [rejectingDraft, setRejectingDraft] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const { data: drafts, isLoading, error, refetch } = useBookingDrafts()
  const approveDraft = useApproveDraft()
  const rejectDraft = useRejectDraft()

  const handleApprove = async (draftId: string) => {
    try {
      await approveDraft.mutateAsync(draftId)
      setToastMessage('Booking draft approved and applied successfully')
      setToastVariant('success')
      setShowToast(true)
      refetch()
    } catch (error) {
      setToastMessage('Failed to approve draft')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const handleReject = async (draftId: string) => {
    try {
      await rejectDraft.mutateAsync({ draftId, notes: rejectNotes })
      setToastMessage('Booking draft rejected')
      setToastVariant('info')
      setShowToast(true)
      setRejectingDraft(null)
      setRejectNotes('')
      refetch()
    } catch (error) {
      setToastMessage('Failed to reject draft')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'cancel':
        return 'red'
      case 'reschedule':
        return 'blue'
      case 'create':
        return 'green'
      default:
        return 'gray'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI booking suggestions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>Failed to load booking drafts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary-600" />
          AI Booking Assistant
        </h1>
        <p className="text-gray-600 mt-1">
          Review and approve AI-suggested booking changes. All changes require staff approval.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{drafts?.length || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Confidence</p>
              <p className="text-2xl font-bold text-green-600">
                {drafts?.filter(d => d.ai_confidence >= 0.8).length || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-2xl font-bold text-yellow-600">
                {drafts?.filter(d => d.ai_confidence < 0.6).length || 0}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Drafts List */}
      {!drafts || drafts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending booking drafts to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const actionColor = getActionColor(draft.action_type)
            const confidenceColor = getConfidenceColor(draft.ai_confidence)

            return (
              <div
                key={draft.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg bg-${actionColor}-100`}>
                      <Calendar className={`w-6 h-6 text-${actionColor}-600`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {draft.action_type} Request
                        </h3>
                        <Badge variant={actionColor as any} className="capitalize">
                          {draft.action_type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm font-medium ${confidenceColor}`}>
                            {Math.round(draft.ai_confidence * 100)}% AI Confidence
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {draft.contact_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          via {draft.source_channel}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(draft.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original Message */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Original Message:</p>
                  <p className="text-gray-900 italic">"{draft.source_message}"</p>
                </div>

                {/* AI Reasoning */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">AI Analysis:</p>
                  <p className="text-sm text-gray-600">{draft.ai_reasoning}</p>
                </div>

                {/* Booking Details */}
                {draft.action_type === 'reschedule' && draft.proposed_date && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">Proposed New Time:</p>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-blue-600">Date</p>
                        <p className="font-medium text-blue-900">
                          {new Date(draft.proposed_date).toLocaleDateString()}
                        </p>
                      </div>
                      {draft.proposed_time && (
                        <div>
                          <p className="text-xs text-blue-600">Time</p>
                          <p className="font-medium text-blue-900">{draft.proposed_time}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-blue-600">Availability</p>
                        <Badge variant={draft.is_available ? 'success' : 'error'}>
                          {draft.is_available ? 'Available' : 'Not Available'}
                        </Badge>
                      </div>
                    </div>

                    {draft.alternative_slots && draft.alternative_slots.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-blue-600 mb-2">Alternative Slots:</p>
                        <div className="flex gap-2 flex-wrap">
                          {draft.alternative_slots.map((slot, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {new Date(slot.date).toLocaleDateString()} at {slot.time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {rejectingDraft === draft.id ? (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Notes (optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                      rows={3}
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Why are you rejecting this suggestion?"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectingDraft(null)
                          setRejectNotes('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(draft.id)}
                        disabled={rejectDraft.isPending}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        {rejectDraft.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 border-t border-gray-200 pt-4">
                    <Button
                      onClick={() => handleApprove(draft.id)}
                      disabled={approveDraft.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveDraft.isPending ? 'Approving...' : 'Approve & Apply'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejectingDraft(draft.id)}
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
