import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getContacts, apiRequest } from '../lib/api'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'

interface Contact {
  id: string
  name: string
  phone: string
  source: string
  instagram_handle?: string
  warmness_score?: number
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  message_body: string
  channel: 'sms' | 'instagram' | 'facebook'
  created_at: number
  status?: string
  detected_intent?: string
}

interface Conversation {
  contact: Contact
  messages: Message[]
  unread_count: number
  last_message_at: number
}

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageText, setMessageText] = useState('')
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'instagram'>('all')
  const queryClient = useQueryClient()

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  })

  // Fetch conversations for selected contact
  const { data: conversation, isLoading: loadingConversation } = useQuery({
    queryKey: ['conversations', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return null
      const response = await apiRequest(`/api/contacts/${selectedContact.id}/conversations`)
      return response
    },
    enabled: !!selectedContact,
  })

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ contact_id, message, channel }: { contact_id: string; message: string; channel: 'sms' | 'instagram' }) => {
      if (channel === 'sms') {
        return await apiRequest('/api/sms/send', {
          method: 'POST',
          body: JSON.stringify({ contact_id, message }),
        })
      } else {
        return await apiRequest('/api/manychat/send', {
          method: 'POST',
          body: JSON.stringify({
            subscriber_id: selectedContact?.instagram_handle,
            message,
          }),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', selectedContact?.id] })
      setMessageText('')
    },
  })

  const handleSendMessage = (channel: 'sms' | 'instagram') => {
    if (!selectedContact || !messageText.trim()) return

    sendMessage.mutate({
      contact_id: selectedContact.id,
      message: messageText.trim(),
      channel,
    })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getChannelIcon = (source: string) => {
    if (source === 'instagram') return '📷'
    if (source === 'facebook') return '👥'
    if (source === 'sms_inbound') return '💬'
    return '📧'
  }

  const getChannelColor = (channel: string) => {
    if (channel === 'instagram') return 'purple'
    if (channel === 'facebook') return 'blue'
    if (channel === 'sms') return 'green'
    return 'gray'
  }

  // Filter contacts based on channel
  const filteredContacts = contacts.filter((contact: Contact) => {
    if (channelFilter === 'all') return true
    if (channelFilter === 'sms') return contact.source === 'sms_inbound'
    if (channelFilter === 'instagram') return contact.source === 'instagram' || contact.source === 'facebook'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">SMS and Instagram/Facebook conversations</p>
        </div>

        {/* Channel Filter */}
        <div className="flex gap-2">
          <Button
            variant={channelFilter === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setChannelFilter('all')}
          >
            All
          </Button>
          <Button
            variant={channelFilter === 'sms' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setChannelFilter('sms')}
          >
            💬 SMS
          </Button>
          <Button
            variant={channelFilter === 'instagram' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setChannelFilter('instagram')}
          >
            📷 Instagram
          </Button>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
        {/* Contact List */}
        <div className="col-span-4">
          <Card className="h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No conversations
                </div>
              ) : (
                filteredContacts.map((contact: Contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={contact.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-gray-900 truncate">
                            {contact.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getChannelIcon(contact.source)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {contact.phone}
                        </div>
                        {contact.instagram_handle && (
                          <div className="text-xs text-purple-600 mt-1">
                            @{contact.instagram_handle}
                          </div>
                        )}
                        {contact.warmness_score && (
                          <div className="mt-2">
                            <Badge
                              variant={
                                contact.warmness_score >= 70
                                  ? 'green'
                                  : contact.warmness_score >= 40
                                  ? 'yellow'
                                  : 'gray'
                              }
                              size="sm"
                            >
                              {contact.warmness_score >= 70 ? '🔥' : ''}
                              Warmness: {contact.warmness_score}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Conversation View */}
        <div className="col-span-8">
          <Card className="h-full flex flex-col">
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={selectedContact.name} size="lg" />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {selectedContact.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedContact.phone}
                          {selectedContact.instagram_handle && (
                            <span className="ml-2 text-purple-600">
                              • @{selectedContact.instagram_handle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getChannelColor(selectedContact.source)}>
                      {getChannelIcon(selectedContact.source)} {selectedContact.source}
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingConversation ? (
                    <div className="text-center text-gray-500">
                      Loading conversation...
                    </div>
                  ) : !conversation?.conversations || conversation.conversations.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No messages yet
                    </div>
                  ) : (
                    conversation.conversations.map((msg: Message) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.direction === 'outbound'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.direction === 'outbound'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.message_body}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className={`text-xs ${
                                msg.direction === 'outbound'
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {formatMessageTime(msg.created_at)}
                            </div>
                            {msg.detected_intent && (
                              <Badge
                                variant={msg.direction === 'outbound' ? 'white' : 'blue'}
                                size="sm"
                              >
                                🤖 {msg.detected_intent}
                              </Badge>
                            )}
                            {msg.channel && (
                              <Badge
                                variant={msg.direction === 'outbound' ? 'white' : getChannelColor(msg.channel)}
                                size="sm"
                              >
                                {getChannelIcon(msg.channel)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (selectedContact.phone) {
                            handleSendMessage('sms')
                          }
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex flex-col gap-2">
                      {selectedContact.phone && (
                        <Button
                          onClick={() => handleSendMessage('sms')}
                          disabled={!messageText.trim() || sendMessage.isPending}
                          size="sm"
                        >
                          💬 SMS
                        </Button>
                      )}
                      {selectedContact.instagram_handle && (
                        <Button
                          onClick={() => handleSendMessage('instagram')}
                          disabled={!messageText.trim() || sendMessage.isPending}
                          variant="secondary"
                          size="sm"
                        >
                          📷 Instagram
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Press Enter to send • Shift+Enter for new line
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {contacts.filter((c: Contact) => c.source === 'sms_inbound').length}
            </div>
            <div className="text-sm text-gray-500">💬 SMS Conversations</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {contacts.filter((c: Contact) => c.source === 'instagram').length}
            </div>
            <div className="text-sm text-gray-500">📷 Instagram Conversations</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {contacts.length}
            </div>
            <div className="text-sm text-gray-500">Total Contacts</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
