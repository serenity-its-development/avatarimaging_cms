import React from 'react'
import { useDiscountCodes, useInfluencers, useCreateDiscountCode, useUpdateDiscountCode, useDeleteDiscountCode } from '../hooks/useAPI'
import { useConfirmDialog } from '../components/ui/Dialog'
import { Tag, Plus, Edit2, Trash2, X, Percent, DollarSign, Calendar, Users, TrendingUp } from 'lucide-react'

interface DiscountCodeFormData {
  code: string
  influencer_id?: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_purchase_amount: number
  max_discount_amount?: number
  usage_limit?: number
  per_customer_limit: number
  valid_from?: number
  valid_until?: number
  notes: string
}

export default function DiscountCodes() {
  const { data: discountCodes, isLoading } = useDiscountCodes()
  const { data: influencers } = useInfluencers()
  const createCode = useCreateDiscountCode()
  const updateCode = useUpdateDiscountCode()
  const deleteCode = useDeleteDiscountCode()
  const { confirm, DialogComponent } = useConfirmDialog()

  const [showModal, setShowModal] = React.useState(false)
  const [editingCode, setEditingCode] = React.useState<any | null>(null)
  const [formData, setFormData] = React.useState<DiscountCodeFormData>({
    code: '',
    influencer_id: undefined,
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: undefined,
    usage_limit: undefined,
    per_customer_limit: 1,
    valid_from: undefined,
    valid_until: undefined,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        influencer_id: formData.influencer_id || undefined
      }

      if (editingCode) {
        await updateCode.mutateAsync({
          id: editingCode.id,
          data: payload
        })
      } else {
        await createCode.mutateAsync(payload)
      }

      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save discount code:', error)
    }
  }

  const handleEdit = (code: any) => {
    setEditingCode(code)
    setFormData({
      code: code.code,
      influencer_id: code.influencer_id || undefined,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_purchase_amount: code.min_purchase_amount || 0,
      max_discount_amount: code.max_discount_amount || undefined,
      usage_limit: code.usage_limit || undefined,
      per_customer_limit: code.per_customer_limit || 1,
      valid_from: code.valid_from || undefined,
      valid_until: code.valid_until || undefined,
      notes: code.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (code: any) => {
    const confirmed = await confirm({
      title: 'Delete Discount Code',
      message: `Are you sure you want to delete "${code.code}"? This will deactivate the code but preserve historical usage data.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      await deleteCode.mutateAsync(code.id)
    }
  }

  const resetForm = () => {
    setEditingCode(null)
    setFormData({
      code: '',
      influencer_id: undefined,
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase_amount: 0,
      max_discount_amount: undefined,
      usage_limit: undefined,
      per_customer_limit: 1,
      valid_from: undefined,
      valid_until: undefined,
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

  const activeCodes = discountCodes?.data?.filter((c: any) => c.is_active) || []

  return (
    <div className="p-6">
      <DialogComponent />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
          <p className="text-gray-600 mt-1">Manage promotional codes and influencer partnerships</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </button>
      </div>

      {/* Codes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeCodes.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No discount codes found. Create your first code to get started.</p>
          </div>
        ) : (
          activeCodes.map((code: any) => {
            const isExpired = code.valid_until && code.valid_until < Date.now()
            const usagePercent = code.usage_limit ? (code.usage_count / code.usage_limit) * 100 : 0

            return (
              <div
                key={code.id}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg text-gray-900">{code.code}</h3>
                      {isExpired && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    {code.influencer_name && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <Users className="w-4 h-4" />
                        {code.influencer_name}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(code)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(code)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-semibold text-green-600">
                      {code.discount_type === 'percentage' ? (
                        <>{code.discount_value}% off</>
                      ) : (
                        <>${code.discount_value} off</>
                      )}
                    </span>
                  </div>

                  {code.min_purchase_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Min purchase:</span>
                      <span className="font-medium">${code.min_purchase_amount}</span>
                    </div>
                  )}

                  {code.max_discount_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Max discount:</span>
                      <span className="font-medium">${code.max_discount_amount}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Usage:</span>
                    <span className="font-medium">
                      {code.usage_count} {code.usage_limit ? `/ ${code.usage_limit}` : ''}
                    </span>
                  </div>

                  {code.usage_limit && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      />
                    </div>
                  )}

                  {code.valid_until && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Expires: {new Date(code.valid_until).toLocaleDateString()}
                    </div>
                  )}

                  {code.notes && (
                    <div className="text-gray-500 text-xs italic mt-2 pt-2 border-t border-gray-100">
                      {code.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCode ? 'Edit Discount Code' : 'Create New Discount Code'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="SUMMER25"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Influencer (Optional)
                  </label>
                  <select
                    value={formData.influencer_id || ''}
                    onChange={e => setFormData({ ...formData, influencer_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None</option>
                    {influencers?.data?.map((inf: any) => (
                      <option key={inf.id} value={inf.id}>
                        {inf.name} - {inf.handle || inf.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed_amount' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Purchase Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={e => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={e => setFormData({ ...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={e => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    value={formData.per_customer_limit}
                    onChange={e => setFormData({ ...formData, per_customer_limit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.valid_from ? new Date(formData.valid_from).toISOString().split('T')[0] : ''}
                    onChange={e => setFormData({ ...formData, valid_from: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : ''}
                    onChange={e => setFormData({ ...formData, valid_until: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Internal)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Internal notes about this code..."
                  />
                </div>
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
                  disabled={createCode.isPending || updateCode.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCode ? 'Update' : 'Create'} Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
