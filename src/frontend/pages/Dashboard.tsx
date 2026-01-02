import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, DataTable } from '../components/ui'
import { TrendingUp, TrendingDown, Users, CheckSquare, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useContacts, useTasks, useDashboardStats } from '../hooks/useAPI'
import { Contact } from '../lib/api'
import { Column } from '../components/ui/DataTable'

export default function Dashboard() {
  // Fetch real data from API
  const { data: contacts, isLoading: contactsLoading } = useContacts({ recent: true, limit: 10 })
  const { data: tasks, isLoading: tasksLoading } = useTasks({ urgent: true })
  const { data: stats, isLoading: statsLoading } = useDashboardStats()

  // Filter urgent tasks
  const urgentTasks = tasks?.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 3) || []

  // Calculate stats with fallbacks
  const dashboardStats = [
    {
      label: 'Active Contacts',
      value: stats?.total_contacts?.toString() || '0',
      change: '+12%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      label: 'Pending Tasks',
      value: stats?.pending_tasks?.toString() || '0',
      change: '-8%',
      trend: 'down' as const,
      icon: CheckSquare,
    },
    {
      label: 'Bookings Today',
      value: stats?.bookings_today?.toString() || '0',
      change: '+23%',
      trend: 'up' as const,
      icon: Calendar,
    },
    {
      label: 'Avg Warmness',
      value: stats?.avg_warmness ? `${Math.round(stats.avg_warmness)}/100` : '0/100',
      change: '+5%',
      trend: 'up' as const,
      icon: Sparkles,
    },
  ]

  // Define table columns for contacts
  const contactColumns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      render: (contact) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm" fallback={contact.name} />
          <div>
            <p className="font-medium text-gray-900">{contact.name}</p>
            <p className="text-xs text-gray-500">{contact.phone || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'warmness_score',
      header: 'AI Warmness',
      sortable: true,
      render: (contact) => {
        const score = contact.warmness_score || 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  score >= 80 ? 'bg-danger-500' :
                  score >= 60 ? 'bg-warning-500' :
                  'bg-primary-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{score}</span>
          </div>
        )
      },
    },
    {
      key: 'current_stage',
      header: 'Stage',
      render: (contact) => (
        <Badge variant="primary" size="sm">{contact.current_stage}</Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (contact) => (
        <span className="text-sm text-gray-600">{contact.source}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index} hover>
            <CardContent className="p-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-success-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-danger-600" />
                      )}
                      <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${index === 3 ? 'bg-gradient-to-br from-ai-100 to-primary-100' : 'bg-gray-100'}`}>
                    <stat.icon className={`w-6 h-6 ${index === 3 ? 'text-ai-600' : 'text-gray-600'}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>⚡ Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : urgentTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No urgent tasks</p>
            ) : (
              urgentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{task.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'primary'}
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-600" />
              <CardTitle>AI Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {contacts && contacts.some(c => (c.warmness_score || 0) >= 80) && (
                  <div className="p-4 bg-gradient-to-r from-ai-50 to-primary-50 rounded-lg border border-ai-200">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-ai-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-ai-900 text-sm">High-Intent Leads Detected</p>
                        <p className="text-sm text-ai-700 mt-1">
                          {contacts.filter(c => (c.warmness_score || 0) >= 80).length} contacts with warmness score above 80.
                          Recommend immediate follow-up within 5 minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4 bg-gradient-to-r from-warning-50 to-orange-50 rounded-lg border border-warning-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-warning-900 text-sm">Speed-to-Lead Optimization</p>
                      <p className="text-sm text-warning-700 mt-1">
                        System is tracking response times. Target: 5 minutes for urgent leads.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contacts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : contacts && contacts.length > 0 ? (
            <DataTable
              columns={contactColumns}
              data={contacts}
              keyField="id"
              onRowClick={(row) => console.log('Clicked row:', row)}
              className="border-0 shadow-none"
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No recent contacts</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
