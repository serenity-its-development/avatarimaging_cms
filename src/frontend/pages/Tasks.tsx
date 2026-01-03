import { useState, useRef, useEffect } from 'react'
import { Plus, List, LayoutGrid, Clock, AlertCircle, X, MoreVertical, Edit, Trash2, CheckCircle, Flag, Filter } from 'lucide-react'
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask, useStaff } from '../hooks/useAPI'
import { Task, CreateTaskInput } from '../lib/api'
import { Button, Badge, Avatar, Card, CardContent, useConfirmDialog } from '../components/ui'
import KanbanBoard, { KanbanColumn, KanbanCard } from '../components/kanban/KanbanBoard'
import { formatRelativeTime, getPriorityColorClass } from '../lib/utils'

export default function TasksPage() {
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'all' | 'my'>('my')
  const [currentUserId] = useState('system') // TODO: Get from auth context
  const { data: tasks, isLoading, refetch } = useTasks()
  const { data: staffList } = useStaff()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const [newTask, setNewTask] = useState<CreateTaskInput>({
    contact_id: '',
    type: 'follow_up',
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: currentUserId,
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTask.mutateAsync(newTask)
      setShowCreateModal(false)
      setNewTask({
        contact_id: '',
        type: 'follow_up',
        title: '',
        description: '',
        priority: 'medium',
        assigned_to: currentUserId,
      })
      refetch()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  // Filter tasks based on selection
  const filteredTasks = taskFilter === 'my'
    ? tasks?.filter(t => t.assigned_to === currentUserId || !t.assigned_to)
    : tasks

  // Group tasks by urgency for list view
  const urgentTasks = filteredTasks?.filter(t => t.priority === 'urgent' && t.status !== 'completed') || []
  const todayTasks = filteredTasks?.filter(t =>
    t.priority === 'high' &&
    t.status !== 'completed' &&
    t.due_date &&
    new Date(t.due_date).toDateString() === new Date().toDateString()
  ) || []
  const thisWeekTasks = filteredTasks?.filter(t =>
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
      cards: filteredTasks?.filter(t => t.status === 'pending').map(taskToKanbanCard) || [],
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'bg-primary-500',
      cards: filteredTasks?.filter(t => t.status === 'in_progress').map(taskToKanbanCard) || [],
    },
    {
      id: 'completed',
      title: 'Completed',
      color: 'bg-success-500',
      cards: filteredTasks?.filter(t => t.status === 'completed').map(taskToKanbanCard) || [],
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
            {filteredTasks?.length || 0} {taskFilter === 'my' ? 'my' : 'total'} tasks • {urgentTasks.length} urgent
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Task Filter Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTaskFilter('my')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                taskFilter === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              My Tasks
            </button>
            <button
              onClick={() => setTaskFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                taskFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              All Tasks
            </button>
          </div>

          {/* View Mode Toggle */}
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
          <Button onClick={() => setShowCreateModal(true)}>
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
                <Button onClick={() => setShowCreateModal(true)}>
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
            onAddCard={(columnId) => setShowCreateModal(true)}
          />
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Follow up with patient"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Task details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="follow_up">Follow Up</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={newTask.assigned_to || ''}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    <option value="system">System (Me)</option>
                    <option value="ai_assistant">🤖 AI Assistant</option>
                    <optgroup label="Staff Members">
                      {staffList?.filter(s => s.is_active).map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name}
                        </option>
                      ))}
                    </optgroup>
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
                  <Button type="submit" className="flex-1">
                    Create Task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog />
    </div>
  )
}

function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleStatusChange = async (status: string) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: { status: status as any },
    })
    setShowDropdown(false)
  }

  const handlePriorityChange = async (priority: string) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: { priority: priority as any },
    })
    setShowDropdown(false)
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (confirmed) {
      await deleteTask.mutateAsync(task.id)
      setShowDropdown(false)
    }
  }

  return (
    <Card hover className="cursor-pointer relative">
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
              <Badge
                variant={
                  task.status === 'completed' ? 'success' :
                  task.status === 'in_progress' ? 'primary' :
                  'default'
                }
                size="sm"
              >
                {task.status.replace('_', ' ')}
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

          <div className="flex items-center gap-2">
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

            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDropdown(!showDropdown)
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-8 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* Status Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </div>
                  <button
                    onClick={() => handleStatusChange('pending')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    Pending
                  </button>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completed
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Priority Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Priority
                  </div>
                  <button
                    onClick={() => handlePriorityChange('low')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4 text-gray-400" />
                    Low
                  </button>
                  <button
                    onClick={() => handlePriorityChange('medium')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4 text-blue-500" />
                    Medium
                  </button>
                  <button
                    onClick={() => handlePriorityChange('high')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4 text-yellow-500" />
                    High
                  </button>
                  <button
                    onClick={() => handlePriorityChange('urgent')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4 text-red-500" />
                    Urgent
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>

                  {/* Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDropdown(false)
                      // TODO: Implement edit functionality
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                    Edit Task
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <ConfirmDialog />
    </Card>
  )
}
