import { useState } from 'react'
import { Plus, Search, Filter, Loader2, X } from 'lucide-react'
import { useContacts, useUpdateContact, useRecalculateWarmness, useCreateContact } from '../hooks/useAPI'
import { Contact, CreateContactInput } from '../lib/api'
import { Button, DataTable, Badge, Avatar, Toast } from '../components/ui'
import ContactSidePanel from '../components/contacts/ContactSidePanel'
import { Column } from '../components/ui/DataTable'

export default function ContactsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success')
  const [newContact, setNewContact] = useState<CreateContactInput>({
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    current_pipeline: 'default',
    current_stage: 'new_lead',
  })

  // Fetch contacts from API
  const { data: contacts, isLoading, error, refetch } = useContacts()
  const updateContact = useUpdateContact()
  const createContact = useCreateContact()
  const recalculateWarmness = useRecalculateWarmness()

  // Handle create contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createContact.mutateAsync(newContact)
      setToastMessage('Contact created successfully')
      setToastVariant('success')
      setShowToast(true)
      setShowCreateModal(false)
      setNewContact({
        name: '',
        phone: '',
        email: '',
        source: 'manual',
        current_pipeline: 'default',
        current_stage: 'new_lead',
      })
      refetch()
    } catch (error) {
      setToastMessage('Failed to create contact')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Filter contacts by search query
  const filteredContacts = contacts?.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  ) || []

  // Handle inline editing
  const handleEdit = async (contact: Contact, field: string, value: any) => {
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        data: { [field]: value },
      })
      setToastMessage(`Contact ${field} updated successfully`)
      setToastVariant('success')
      setShowToast(true)
    } catch (error) {
      setToastMessage(`Failed to update contact`)
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Handle warmness recalculation
  const handleRecalculateWarmness = async (contactId: string) => {
    try {
      await recalculateWarmness.mutateAsync(contactId)
      setToastMessage('AI warmness recalculated successfully')
      setToastVariant('success')
      setShowToast(true)
    } catch (error) {
      setToastMessage('Failed to recalculate warmness')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  // Define table columns
  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      width: 'w-64',
      render: (contact) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm" fallback={contact.name} />
          <div>
            <p className="font-medium text-gray-900">{contact.name}</p>
            {contact.phone && (
              <p className="text-xs text-gray-500">{contact.phone}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      editable: true,
      render: (contact) => (
        <span className="text-sm text-gray-600">{contact.email || '-'}</span>
      ),
    },
    {
      key: 'warmness_score',
      header: 'AI Warmness',
      sortable: true,
      render: (contact) => {
        const score = contact.warmness_score || 0
        return (
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  score >= 80 ? 'bg-danger-500' :
                  score >= 60 ? 'bg-warning-500' :
                  'bg-primary-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-8">{score}</span>
          </div>
        )
      },
    },
    {
      key: 'current_stage',
      header: 'Stage',
      render: (contact) => (
        <Badge variant="primary" size="sm">
          {contact.current_stage}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (contact) => (
        <span className="text-sm text-gray-600">{contact.source}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (contact) => {
        const date = new Date(contact.created_at)
        return (
          <span className="text-sm text-gray-600">
            {date.toLocaleDateString()}
          </span>
        )
      },
    },
  ]

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-danger-600 font-semibold mb-2">Failed to load contacts</p>
          <p className="text-gray-500 text-sm mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your patient contacts and leads
            {contacts && ` (${contacts.length} total)`}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Contact
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <Button variant="outline" size="md">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Contacts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading contacts...</p>
          </div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <div className="text-center">
            <p className="text-gray-500 font-medium mb-2">No contacts found</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchQuery ? 'Try a different search query' : 'Get started by creating your first contact'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Create Contact
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredContacts}
            keyField="id"
            onRowClick={(contact) => setSelectedContact(contact)}
            onEdit={handleEdit}
            className="h-full"
          />
        </div>
      )}

      {/* Side Panel */}
      {selectedContact && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSelectedContact(null)}
          />
          <ContactSidePanel
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onUpdate={(data) => handleEdit(selectedContact, Object.keys(data)[0], Object.values(data)[0])}
          />
        </>
      )}

      {/* Create Contact Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Contact</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateContact} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+61 400 000 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={newContact.source}
                    onChange={(e) => setNewContact({ ...newContact, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="website_form">Website Form</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="sms_inbound">SMS Inbound</option>
                    <option value="phone_call">Phone Call</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Contact'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast
            variant={toastVariant}
            title={toastMessage}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
