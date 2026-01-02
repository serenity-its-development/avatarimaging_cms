import { useState } from 'react'
import KanbanBoard, { KanbanColumn, KanbanCard } from '../components/kanban/KanbanBoard'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui'

export default function Pipeline() {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'new_lead',
      title: 'New Lead',
      color: 'bg-ai-500',
      cards: [
        {
          id: '1',
          title: 'John Smith',
          description: 'Interested in urgent MRI scan',
          warmness: 87,
          assignee: 'Admin',
          priority: 'urgent',
          dueDate: '5 min',
          tags: ['Meta Ads', 'MRI'],
        },
        {
          id: '2',
          title: 'Sarah Lee',
          description: 'Follow-up from ManyChat',
          warmness: 72,
          assignee: 'Admin',
          priority: 'high',
          dueDate: '15 min',
          tags: ['ManyChat'],
        },
      ],
    },
    {
      id: 'contacted',
      title: 'Contacted',
      color: 'bg-primary-500',
      cards: [
        {
          id: '3',
          title: 'Mike Chen',
          description: 'Responded positively to SMS',
          warmness: 65,
          assignee: 'Admin',
          priority: 'medium',
          dueDate: '1 hour',
          tags: ['SMS', 'Routine'],
        },
      ],
    },
    {
      id: 'qualified',
      title: 'Qualified',
      color: 'bg-teal-500',
      cards: [
        {
          id: '4',
          title: 'Lisa Wong',
          description: 'Budget confirmed, ready to book',
          warmness: 91,
          assignee: 'Admin',
          priority: 'high',
          dueDate: 'Today',
          tags: ['Referral', 'CT Scan'],
        },
      ],
    },
    {
      id: 'booked',
      title: 'Booked',
      color: 'bg-success-500',
      cards: [
        {
          id: '5',
          title: 'David Park',
          description: 'Appointment scheduled for tomorrow',
          warmness: 85,
          assignee: 'Admin',
          dueDate: 'Tomorrow 10 AM',
          tags: ['Confirmed'],
        },
      ],
    },
    {
      id: 'attended',
      title: 'Attended',
      color: 'bg-gray-400',
      cards: [],
    },
  ])

  const handleCardMove = (cardId: string, fromColumn: string, toColumn: string) => {
    console.log(`Move card ${cardId} from ${fromColumn} to ${toColumn}`)

    // Find and move the card
    setColumns((prev) => {
      const newColumns = prev.map((col) => ({ ...col, cards: [...col.cards] }))

      const sourceCol = newColumns.find((c) => c.id === fromColumn)
      const targetCol = newColumns.find((c) => c.id === toColumn)

      if (sourceCol && targetCol) {
        const cardIndex = sourceCol.cards.findIndex((c) => c.id === cardId)
        if (cardIndex !== -1) {
          const [card] = sourceCol.cards.splice(cardIndex, 1)
          targetCol.cards.push(card)
        }
      }

      return newColumns
    })
  }

  const handleCardClick = (card: KanbanCard) => {
    console.log('Clicked card:', card)
    // TODO: Open side panel with card details
  }

  const handleAddCard = (columnId: string) => {
    console.log('Add card to column:', columnId)
    // TODO: Open add card modal
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
