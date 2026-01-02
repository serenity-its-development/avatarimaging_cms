import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContacts, useUpdateContact } from '../hooks/useAPI'
import KanbanBoard, { KanbanColumn, KanbanCard } from '../components/kanban/KanbanBoard'
import { Card, CardContent } from '../components/ui'
import { Loader2 } from 'lucide-react'
import { Contact } from '../lib/api'

export default function Pipeline() {
  const navigate = useNavigate()
  const { data: contacts, isLoading } = useContacts()
  const updateContact = useUpdateContact()

  // Group contacts by pipeline stage
  const stages = ['new_lead', 'contacted', 'qualified', 'booked', 'attended']
  const stageLabels: Record<string, string> = {
    new_lead: 'New Lead',
    contacted: 'Contacted',
    qualified: 'Qualified',
    booked: 'Booked',
    attended: 'Attended',
  }
  const stageColors: Record<string, string> = {
    new_lead: 'bg-ai-500',
    contacted: 'bg-primary-500',
    qualified: 'bg-teal-500',
    booked: 'bg-success-500',
    attended: 'bg-gray-400',
  }

  const columns: KanbanColumn[] = stages.map(stage => ({
    id: stage,
    title: stageLabels[stage],
    color: stageColors[stage],
    cards: contacts
      ?.filter(c => c.current_stage === stage)
      .map(contactToKanbanCard) || [],
  }))

  function contactToKanbanCard(contact: Contact): KanbanCard {
    const daysSinceCreated = Math.floor((Date.now() - contact.created_at) / (1000 * 60 * 60 * 24))
    return {
      id: contact.id,
      title: contact.name,
      description: contact.phone || contact.email,
      warmness: contact.warmness_score,
      assignee: 'Admin',
      dueDate: `${daysSinceCreated}d in stage`,
      tags: [contact.source],
    }
  }

  const handleCardMove = async (cardId: string, fromColumn: string, toColumn: string) => {
    try {
      await updateContact.mutateAsync({
        id: cardId,
        data: { current_stage: toColumn },
      })
    } catch (error) {
      console.error('Failed to update contact stage:', error)
    }
  }

  const handleCardClick = (card: KanbanCard) => {
    console.log('Clicked card:', card)
    // TODO: Open contact detail panel
  }

  const handleAddCard = (columnId: string) => {
    // Navigate to contacts page to create new contact with the stage pre-set
    navigate(`/contacts?stage=${columnId}`)
    // Or you could open a modal here - for now, redirect to contacts with create modal
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">Track leads through your sales funnel</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {columns.map((col) => (
          <Card key={col.id} hover>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{col.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{col.cards.length}</p>
                </div>
                <div className={`w-10 h-10 ${col.color} rounded-lg opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          onCardMove={handleCardMove}
          onCardClick={handleCardClick}
          onAddCard={handleAddCard}
        />
      </div>
    </div>
  )
}
