import { useState } from 'react'
import { Plus, List, LayoutGrid, Clock, AlertCircle } from 'lucide-react'
import { useTasks, useUpdateTask, useCreateTask } from '../hooks/useAPI'
import { Task } from '../lib/api'
import { Button, Badge, Avatar, Card, CardContent } from '../components/ui'
import KanbanBoard, { KanbanColumn, KanbanCard } from '../components/kanban/KanbanBoard'
import { formatRelativeTime, getPriorityColorClass } from '../lib/utils'

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const { data: tasks, isLoading } = useTasks()
  const updateTask = useUpdateTask()

  // Group tasks by urgency for list view
  const urgentTasks = tasks?.filter(t => t.priority === 'urgent' && t.status !== 'completed') || []
  const todayTasks = tasks?.filter(t =>
    t.priority === 'high' &&
    t.status !== 'completed' &&
    t.due_date &&
    new Date(t.due_date).toDateString() === new Date().toDateString()
  ) || []
  const thisWeekTasks = tasks?.filter(t =>
    t.status !== 'completed' &&
    !urgentTasks.includes(t) &&
    !todayTasks.includes(t)
  ) || []

  // Convert tasks to Kanban format
  const kanbanColumns: KanbanColumn[] = [
    {
      id: 'pending',
      title: 'To Do',
      color: 'bg-gray-500',
      cards: tasks?.filter(t => t.status === 'pending').map(taskToKanbanCard) || [],
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'bg-primary-500',
      cards: tasks?.filter(t => t.status === 'in_progress').map(taskToKanbanCard) || [],
    },
    {
      id: 'completed',
      title: 'Completed',
      color: 'bg-success-500',
      cards: tasks?.filter(t => t.status === 'completed').map(taskToKanbanCard) || [],
    },
  ]

  function taskToKanbanCard(task: Task): KanbanCard {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assigned_to || 'Unassigned',
      dueDate: task.due_date ? formatRelativeTime(task.due_date) : undefined,
      tags: [task.type],
    }
  }

  const handleCardMove = async (cardId: string, fromColumn: string, toColumn: string) => {
    await updateTask.mutateAsync({
      id: cardId,
      data: { status: toColumn as any },
    })
  }

  const handleCompleteTask = async (taskId: string) => {
    await updateTask.mutateAsync({
      id: taskId,
      data: { status: 'completed', completed_at: Date.now() },
    })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading tasks...</div>
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks?.length || 0} total tasks • {urgentTasks.length} urgent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Button>
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-6 flex-1 overflow-y-auto scrollbar-thin">
          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-danger-600" />
                <h2 className="font-semibold text-gray-900">Urgent</h2>
                <Badge variant="danger" size="sm">{urgentTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {urgentTasks.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                ))}
              </div>
            </div>
          )}

          {/* Today's Tasks */}
          {todayTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-warning-600" />
                <h2 className="font-semibold text-gray-900">Today</h2>
                <Badge variant="warning" size="sm">{todayTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                ))}
              </div>
            </div>
          )}

          {/* This Week */}
          {thisWeekTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-gray-900">This Week</h2>
                <Badge variant="default" size="sm">{thisWeekTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {thisWeekTasks.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleCompleteTask} />
                ))}
              </div>
            </div>
          )}

          {tasks?.length === 0 && (
            <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-gray-500 font-medium mb-2">No tasks yet</p>
                <p className="text-sm text-gray-400 mb-4">Create your first task to get started</p>
                <Button>
                  <Plus className="w-4 h-4" />
                  Create Task
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            columns={kanbanColumns}
            onCardMove={handleCardMove}
            onCardClick={(card) => console.log('Task clicked:', card)}
          />
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  return (
    <Card hover className="cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <Badge
                variant={
                  task.priority === 'urgent' ? 'danger' :
                  task.priority === 'high' ? 'warning' :
                  'default'
                }
                size="sm"
              >
                {task.priority}
              </Badge>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.due_date ? formatRelativeTime(task.due_date) : 'No due date'}
              </span>
              {task.assigned_to && (
                <span className="flex items-center gap-1">
                  <Avatar size="sm" fallback={task.assigned_to} />
                  {task.assigned_to}
                </span>
              )}
            </div>
          </div>
          {task.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onComplete(task.id)
              }}
            >
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
