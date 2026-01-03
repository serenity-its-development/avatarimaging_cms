import { useState } from 'react'
import { Plus, Search, UserCog, Shield, Loader2, Edit2, Trash2 } from 'lucide-react'
import { useStaff, useRoles, useCreateStaff, useUpdateStaff, useDeleteStaff } from '../hooks/useAPI'
import { Staff, Role } from '../lib/api'
import { Button, DataTable, Badge, Toast, useConfirmDialog } from '../components/ui'
import { Column } from '../components/ui/DataTable'

export default function StaffPage() {
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success')
  const [newStaff, setNewStaff] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: '',
  })

  // Fetch data
  const { data: staff, isLoading, error, refetch } = useStaff()
  const { data: roles } = useRoles()
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const deleteStaff = useDeleteStaff()

  // Helper to get full name
  const getFullName = (s: Staff) => `${s.first_name} ${s.last_name}`.trim()

  // Filter staff by search query
  const filteredStaff = staff?.filter((member) => {
    const fullName = getFullName(member)
    const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery)
    return matchesSearch
  }) || []

  // Handle create staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createStaff.mutateAsync(newStaff)
      setToastMessage('Staff member created successfully')
      setToastVariant('success')
      setShowToast(true)
      setShowCreateModal(false)
      setNewStaff({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role_id: '',
      })
      refetch()
    } catch (error) {
      setToastMessage('Failed to create staff member')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle update staff
  const handleUpdateStaff = async () => {
    if (!editingStaff) return
    try {
      await updateStaff.mutateAsync({
        id: editingStaff.id,
        data: {
          first_name: editingStaff.first_name,
          last_name: editingStaff.last_name,
          email: editingStaff.email,
          phone: editingStaff.phone,
          role_id: editingStaff.role_id,
          can_be_assigned: editingStaff.can_be_assigned,
        },
      })
      setToastMessage('Staff member updated successfully')
      setToastVariant('success')
      setShowToast(true)
      setEditingStaff(null)
      refetch()
    } catch (error) {
      setToastMessage('Failed to update staff member')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle delete staff
  const handleDeleteStaff = async (id: string) => {
    const confirmed = await confirm({
      title: 'Deactivate Staff Member',
      message: 'Are you sure you want to deactivate this staff member? They will no longer have access to the system.',
      type: 'warning',
      confirmText: 'Deactivate',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      await deleteStaff.mutateAsync(id)
      setToastMessage('Staff member deactivated successfully')
      setToastVariant('success')
      setShowToast(true)
      refetch()
    } catch (error) {
      setToastMessage('Failed to deactivate staff member')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Table columns
  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (staff) => {
        const fullName = getFullName(staff)
        const initials = `${staff.first_name[0] || ''}${staff.last_name[0] || ''}`.toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {initials}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{fullName}</div>
              <div className="text-sm text-gray-500">{staff.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (staff) => (
        <span className="text-gray-600">{staff.phone || '—'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (staff) => (
        <Badge variant="secondary">
          <Shield className="w-3 h-3 mr-1" />
          {staff.role?.name || 'No Role'}
        </Badge>
      ),
    },
    {
      key: 'can_be_assigned',
      header: 'Assignable',
      render: (staff) => (
        <Badge variant={staff.can_be_assigned ? 'success' : 'secondary'}>
          {staff.can_be_assigned ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (staff) => (
        <Badge variant={staff.is_active ? 'success' : 'secondary'}>
          {staff.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (staff) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingStaff(staff)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteStaff(staff.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">Failed to load staff members</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their roles</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Staff Table */}
      <DataTable
        data={filteredStaff}
        columns={columns}
        keyExtractor={(staff) => staff.id}
      />

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Staff Member</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={newStaff.first_name}
                    onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={newStaff.last_name}
                    onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={newStaff.role_id}
                  onChange={(e) => setNewStaff({ ...newStaff, role_id: e.target.value })}
                >
                  <option value="">Select a role...</option>
                  {roles?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createStaff.isPending}
                >
                  {createStaff.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Staff Member'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Staff Member</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={editingStaff.first_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={editingStaff.last_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={editingStaff.phone || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={editingStaff.role_id}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role_id: e.target.value })}
                >
                  <option value="">Select a role...</option>
                  {roles?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_can_be_assigned"
                  checked={editingStaff.can_be_assigned}
                  onChange={(e) => setEditingStaff({ ...editingStaff, can_be_assigned: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="edit_can_be_assigned" className="text-sm font-medium text-gray-700">
                  Can be assigned to contacts
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateStaff}
                  className="flex-1"
                  disabled={updateStaff.isPending}
                >
                  {updateStaff.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Staff Member'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setShowToast(false)}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
