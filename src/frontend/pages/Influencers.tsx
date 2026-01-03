import React from 'react'
import { useInfluencers, useInfluencerStats, useCreateInfluencer, useUpdateInfluencer, useDeleteInfluencer } from '../hooks/useAPI'
import { useConfirmDialog } from '../components/ui/Dialog'
import { Users, Plus, Edit2, Trash2, X, TrendingUp, DollarSign, Tag, Mail, Phone, Hash } from 'lucide-react'

interface InfluencerFormData {
  name: string
  email: string
  phone: string
  platform: string
  handle: string
  commission_rate: number
  notes: string
}

export default function Influencers() {
  const { data: influencers, isLoading } = useInfluencers()
  const createInfluencer = useCreateInfluencer()
  const updateInfluencer = useUpdateInfluencer()
  const deleteInfluencer = useDeleteInfluencer()
  const { confirm, DialogComponent } = useConfirmDialog()

  const [showModal, setShowModal] = React.useState(false)
  const [editingInfluencer, setEditingInfluencer] = React.useState<any | null>(null)
  const [selectedInfluencer, setSelectedInfluencer] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<InfluencerFormData>({
    name: '',
    email: '',
    phone: '',
    platform: '',
    handle: '',
    commission_rate: 10,
    notes: ''
  })

  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn', 'Other']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingInfluencer) {
        await updateInfluencer.mutateAsync({
          id: editingInfluencer.id,
          data: formData
        })
      } else {
        await createInfluencer.mutateAsync(formData)
      }

      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save influencer:', error)
    }
  }

  const handleEdit = (influencer: any) => {
    setEditingInfluencer(influencer)
    setFormData({
      name: influencer.name,
      email: influencer.email || '',
      phone: influencer.phone || '',
      platform: influencer.platform || '',
      handle: influencer.handle || '',
      commission_rate: influencer.commission_rate || 10,
      notes: influencer.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (influencer: any) => {
    const confirmed = await confirm({
      title: 'Delete Influencer',
      message: `Are you sure you want to delete "${influencer.name}"? This will deactivate the influencer but preserve historical performance data.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      await deleteInfluencer.mutateAsync(influencer.id)
    }
  }

  const resetForm = () => {
    setEditingInfluencer(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      platform: '',
      handle: '',
      commission_rate: 10,
      notes: ''
    })
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeInfluencers = influencers?.data?.filter((i: any) => i.is_active) || []

  return (
    <div className="p-6">
      <DialogComponent />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
          <p className="text-gray-600 mt-1">Manage influencer partnerships and track performance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Influencer
        </button>
      </div>

      {/* Influencers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeInfluencers.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No influencers found. Add your first influencer to get started.</p>
          </div>
        ) : (
          activeInfluencers.map((influencer: any) => (
            <div
              key={influencer.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{influencer.name}</h3>
                  {influencer.platform && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Tag className="w-4 h-4" />
                      {influencer.platform}
                    </div>
                  )}
                  {influencer.handle && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Hash className="w-4 h-4" />
                      {influencer.handle}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(influencer)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(influencer)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Referrals</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {influencer.total_referrals || 0}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ${(influencer.total_revenue || 0).toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span>Commission:</span>
                  <span className="font-semibold">{influencer.commission_rate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Est. Commission:</span>
                  <span className="font-semibold text-green-600">
                    ${((influencer.total_revenue || 0) * (influencer.commission_rate / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              {(influencer.email || influencer.phone) && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                  {influencer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {influencer.email}
                    </div>
                  )}
                  {influencer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {influencer.phone}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelectedInfluencer(influencer.id)}
                className="w-full mt-3 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingInfluencer ? 'Edit Influencer' : 'Add New Influencer'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    value={formData.platform}
                    onChange={e => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select platform</option>
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handle / Username
                  </label>
                  <input
                    type="text"
                    value={formData.handle}
                    onChange={e => setFormData({ ...formData, handle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%) *
                </label>
                <input
                  type="number"
                  value={formData.commission_rate}
                  onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Internal)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Internal notes about this influencer..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInfluencer.isPending || updateInfluencer.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingInfluencer ? 'Update' : 'Add'} Influencer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedInfluencer && (
        <InfluencerDetailsModal
          influencerId={selectedInfluencer}
          onClose={() => setSelectedInfluencer(null)}
        />
      )}
    </div>
  )
}

function InfluencerDetailsModal({ influencerId, onClose }: { influencerId: string; onClose: () => void }) {
  const { data: stats, isLoading } = useInfluencerStats(influencerId)

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const influencer = stats?.influencer

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{influencer?.name} - Performance</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Total Referrals</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{stats?.total_referrals || 0}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
              <div className="text-3xl font-bold text-green-600">${(stats?.total_revenue || 0).toFixed(2)}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Commission Earned</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">${(stats?.total_commission || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Discount Codes */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Active Discount Codes</h3>
            <div className="text-2xl font-bold text-blue-600">{stats?.discount_codes || 0}</div>
          </div>

          {/* Recent Referrals */}
          {stats?.recent_referrals && stats.recent_referrals.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recent Referrals</h3>
              <div className="space-y-2">
                {stats.recent_referrals.slice(0, 5).map((referral: any) => (
                  <div key={referral.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{referral.contact_name}</div>
                      <div className="text-sm text-gray-600">{referral.contact_email}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">${referral.amount?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
