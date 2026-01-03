import React from 'react'
import { useProcedures, useCreateProcedure, useUpdateProcedure, useDeleteProcedure } from '../hooks/useAPI'
import { useConfirmDialog } from '../components/ui/Dialog'
import { DollarSign, Clock, Plus, Edit2, Trash2, X } from 'lucide-react'

interface ProcedureFormData {
  name: string
  description: string
  duration_minutes: number
  base_price: number
  category: string
  requires_deposit: boolean
  deposit_amount: number
}

export default function Procedures() {
  const { data: procedures, isLoading } = useProcedures()
  const createProcedure = useCreateProcedure()
  const updateProcedure = useUpdateProcedure()
  const deleteProcedure = useDeleteProcedure()
  const { confirm, DialogComponent } = useConfirmDialog()

  const [showModal, setShowModal] = React.useState(false)
  const [editingProcedure, setEditingProcedure] = React.useState<any | null>(null)
  const [formData, setFormData] = React.useState<ProcedureFormData>({
    name: '',
    description: '',
    duration_minutes: 30,
    base_price: 0,
    category: '',
    requires_deposit: false,
    deposit_amount: 0
  })

  const categories = ['Screening', 'Imaging', 'Consultation', 'Other']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingProcedure) {
        await updateProcedure.mutateAsync({
          id: editingProcedure.id,
          data: formData
        })
      } else {
        await createProcedure.mutateAsync(formData)
      }

      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save procedure:', error)
    }
  }

  const handleEdit = (procedure: any) => {
    setEditingProcedure(procedure)
    setFormData({
      name: procedure.name,
      description: procedure.description || '',
      duration_minutes: procedure.duration_minutes,
      base_price: procedure.base_price,
      category: procedure.category || '',
      requires_deposit: procedure.requires_deposit,
      deposit_amount: procedure.deposit_amount
    })
    setShowModal(true)
  }

  const handleDelete = async (procedure: any) => {
    const confirmed = await confirm({
      title: 'Delete Procedure',
      message: `Are you sure you want to delete "${procedure.name}"? This will not affect existing bookings.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      await deleteProcedure.mutateAsync(procedure.id)
    }
  }

  const resetForm = () => {
    setEditingProcedure(null)
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      base_price: 0,
      category: '',
      requires_deposit: false,
      deposit_amount: 0
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

  const activeProcedures = procedures?.data?.filter((p: any) => p.is_active) || []
  const groupedProcedures = activeProcedures.reduce((acc: any, proc: any) => {
    const cat = proc.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(proc)
    return acc
  }, {})

  return (
    <div className="p-6">
      <DialogComponent />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procedures & Services</h1>
          <p className="text-gray-600 mt-1">Manage your medical procedures and pricing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Procedure
        </button>
      </div>

      {/* Procedures List */}
      <div className="space-y-6">
        {Object.keys(groupedProcedures).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No procedures found. Add your first procedure to get started.</p>
          </div>
        ) : (
          Object.keys(groupedProcedures).map(category => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{category}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupedProcedures[category].map((procedure: any) => (
                  <div
                    key={procedure.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{procedure.name}</h3>
                        {procedure.description && (
                          <p className="text-sm text-gray-600 mt-1">{procedure.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(procedure)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(procedure)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {procedure.duration_minutes} mins
                      </div>
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        ${procedure.base_price.toFixed(2)}
                      </div>
                    </div>

                    {procedure.requires_deposit && (
                      <div className="mt-2 text-xs text-gray-500">
                        Deposit required: ${procedure.deposit_amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProcedure ? 'Edit Procedure' : 'Add New Procedure'}
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
                  Procedure Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="5"
                    step="5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    value={formData.base_price}
                    onChange={e => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.requires_deposit}
                    onChange={e => setFormData({ ...formData, requires_deposit: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Requires deposit</span>
                </label>

                {formData.requires_deposit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={e => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
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
                  disabled={createProcedure.isPending || updateProcedure.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingProcedure ? 'Update' : 'Create'} Procedure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
