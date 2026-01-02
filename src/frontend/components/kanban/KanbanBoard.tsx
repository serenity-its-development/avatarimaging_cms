import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, Badge, Avatar } from '../ui'
import { MoreVertical, Plus, Clock, AlertCircle } from 'lucide-react'

export interface KanbanCard {
  id: string
  title: string
  description?: string
  assignee?: string
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  dueDate?: string
  tags?: string[]
  warmness?: number
}

export interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
  color?: string
  limit?: number
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void
  onCardClick?: (card: KanbanCard) => void
  onAddCard?: (columnId: string) => void
}

export default function KanbanBoard({ columns, onCardMove, onCardClick, onAddCard }: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<{ card: KanbanCard; fromColumn: string } | null>(null)

  const handleDragStart = (card: KanbanCard, columnId: string) => {
    setDraggedCard({ card, fromColumn: columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault()
    if (draggedCard && draggedCard.fromColumn !== toColumnId) {
      onCardMove?.(draggedCard.card.id, draggedCard.fromColumn, toColumnId)
    }
    setDraggedCard(null)
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'danger'
      case 'high': return 'warning'
      case 'medium': return 'primary'
      default: return 'default'
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full scrollbar-thin">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 w-80 bg-gray-50 rounded-lg border border-gray-200"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* Column Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    column.color || 'bg-gray-400'
                  )}
                  style={column.color?.startsWith('#') ? { backgroundColor: column.color } : {}}
                />
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                  {column.cards.length}
                  {column.limit && `/${column.limit}`}
                </span>
              </div>
              <button
                onClick={() => onAddCard?.(column.id)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Add card"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
            {column.cards.map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(card, column.id)}
                onClick={() => onCardClick?.(card)}
                className={cn(
                  'bg-white rounded-lg border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-soft-lg hover:border-primary-300',
                  draggedCard?.card.id === card.id && 'opacity-50'
                )}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 text-sm flex-1 line-clamp-2">
                    {card.title}
                  </h4>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Description */}
                {card.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {card.description}
                  </p>
                )}

                {/* Warmness Score (if present) */}
                {card.warmness !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">AI Warmness</span>
                      <span className="text-xs font-bold text-ai-600">{card.warmness}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          card.warmness >= 80 ? 'bg-danger-500' :
                          card.warmness >= 60 ? 'bg-warning-500' :
                          'bg-primary-500'
                        )}
                        style={{ width: `${card.warmness}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {card.assignee && (
                      <Avatar size="sm" fallback={card.assignee} />
                    )}
                    {card.priority && (
                      <Badge variant={getPriorityColor(card.priority) as any} size="sm" dot>
                        {card.priority}
                      </Badge>
                    )}
                  </div>

                  {card.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {card.dueDate}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {column.cards.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No cards</p>
                <button
                  onClick={() => onAddCard?.(column.id)}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                >
                  Add first card
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
