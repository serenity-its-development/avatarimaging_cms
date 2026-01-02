import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContacts, useUpdateContact, usePipelines, useDefaultPipeline } from '../hooks/useAPI'
import KanbanBoard, { KanbanColumn, KanbanCard } from '../components/kanban/KanbanBoard'
import { Card, CardContent } from '../components/ui'
import { Loader2, ChevronDown, Settings } from 'lucide-react'
import { Contact } from '../lib/api'

export default function Pipeline() {
  const navigate = useNavigate()
  const { data: contacts, isLoading: loadingContacts } = useContacts()
  const updateContact = useUpdateContact()
  const { data: pipelines, isLoading: loadingPipelines } = usePipelines()
  const { data: defaultPipeline } = useDefaultPipeline()

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false)

  // Use default pipeline if none selected
  const activePipelineId = selectedPipelineId || defaultPipeline?.id || 'lead_to_booking'
  const activePipeline = useMemo(() =>
    pipelines?.find(p => p.id === activePipelineId),
    [pipelines, activePipelineId]
  )

  const columns: KanbanColumn[] = useMemo(() => {
    if (!activePipeline?.stages) return []

    return activePipeline.stages
      .sort((a, b) => a.display_order - b.display_order)
      .map(stage => ({
        id: stage.key,
        title: stage.name,
        color: stage.color || 'bg-gray-400',
        cards: contacts
          ?.filter(c =>
            c.current_pipeline === activePipelineId &&
            c.current_stage === stage.key
          )
          .map(contactToKanbanCard) || [],
      }))
  }, [activePipeline, contacts, activePipelineId])

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

  if (loadingContacts || loadingPipelines) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Track leads through your sales funnel</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Pipeline Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {activePipeline?.name || 'Select Pipeline'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Pipeline Dropdown */}
            {showPipelineDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {pipelines?.map((pipeline) => (
                  <button
                    key={pipeline.id}
                    onClick={() => {
                      setSelectedPipelineId(pipeline.id)
                      setShowPipelineDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      pipeline.id === activePipelineId ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: pipeline.color || '#6B7280' }}
                      />
                      {pipeline.name}
                    </span>
                    {pipeline.is_default && (
                      <span className="text-xs text-gray-500">Default</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manage Pipelines Button */}
          <button
            onClick={() => navigate('/settings/pipelines')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Manage Pipelines</span>
          </button>
        </div>
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
