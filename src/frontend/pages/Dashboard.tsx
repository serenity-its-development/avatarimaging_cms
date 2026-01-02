import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, DataTable } from '../components/ui'
import { TrendingUp, TrendingDown, Users, CheckSquare, Calendar, Sparkles } from 'lucide-react'
import { getWarmnessColorClass, getPriorityColorClass } from '../lib/utils'

export default function Dashboard() {
  // Mock data
  const stats = [
    { label: 'Active Contacts', value: '1,234', change: '+12%', trend: 'up', icon: Users },
    { label: 'Pending Tasks', value: '47', change: '-8%', trend: 'down', icon: CheckSquare },
    { label: 'Bookings Today', value: '18', change: '+23%', trend: 'up', icon: Calendar },
    { label: 'Avg Warmness', value: '76/100', change: '+5%', trend: 'up', icon: Sparkles },
  ]

  const recentContacts = [
    { id: 1, name: 'John Smith', phone: '+61 412 345 678', warmness: 87, stage: 'New Lead', source: 'Meta Ads' },
    { id: 2, name: 'Sarah Lee', phone: '+61 423 456 789', warmness: 72, stage: 'Contacted', source: 'ManyChat' },
    { id: 3, name: 'Mike Chen', phone: '+61 434 567 890', warmness: 65, stage: 'Booked', source: 'Website' },
    { id: 4, name: 'Lisa Wong', phone: '+61 445 678 901', warmness: 91, stage: 'New Lead', source: 'Referral' },
  ]

  const urgentTasks = [
    { id: 1, task: 'Call John Smith', contact: 'John Smith', due: '5 min', priority: 'urgent' },
    { id: 2, task: 'SMS Sarah Lee', contact: 'Sarah Lee', due: '15 min', priority: 'high' },
    { id: 3, task: 'Booking Confirm', contact: 'Mike Chen', due: '1 hour', priority: 'medium' },
  ]

  const contactColumns = [
    {
      key: 'name',
      header: 'Contact',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm" fallback={row.name} />
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'warmness',
      header: 'AI Warmness',
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${row.warmness >= 80 ? 'bg-danger-500' : row.warmness >= 60 ? 'bg-warning-500' : 'bg-primary-500'}`}
              style={{ width: `${row.warmness}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{row.warmness}</span>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (row: any) => (
        <Badge variant="primary" size="sm">{row.stage}</Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row: any) => (
        <span className="text-sm text-gray-600">{row.source}</span>
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
        {stats.map((stat, index) => (
          <Card key={index} hover>
            <CardContent className="p-6">
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
            {urgentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{task.task}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.contact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'warning' : 'primary'} size="sm">
                    {task.due}
                  </Badge>
                </div>
              </div>
            ))}
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
            <div className="p-4 bg-gradient-to-r from-ai-50 to-primary-50 rounded-lg border border-ai-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-ai-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-ai-900 text-sm">High-Intent Lead Detected</p>
                  <p className="text-sm text-ai-700 mt-1">
                    Lisa Wong (warmness: 91/100) mentioned "urgent MRI scan" - recommend immediate follow-up within 5 minutes.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-warning-50 to-orange-50 rounded-lg border border-warning-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-warning-900 text-sm">Speed-to-Lead Alert</p>
                  <p className="text-sm text-warning-700 mt-1">
                    3 new leads from Meta Ads campaign require immediate contact. Average response time: 4:23 min.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contacts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={contactColumns}
            data={recentContacts}
            keyField="id"
            onRowClick={(row) => console.log('Clicked row:', row)}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}
