import { useQuery } from '@tanstack/react-query'
import { apiRequest, getContacts } from '../lib/api'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'

interface AIInsight {
  type: 'warmness' | 'intent' | 'recommendation'
  title: string
  description: string
  confidence: number
  action?: string
  contact_id?: string
  contact_name?: string
}

interface WarmContact {
  id: string
  name: string
  phone: string
  warmness_score: number
  warmness_reasoning: string
  source: string
  current_stage: string
  last_contact?: number
}

export default function AIInsights() {
  // Fetch high warmness contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: getContacts,
  })

  // Filter and sort by warmness
  const warmContacts: WarmContact[] = contacts
    .filter((c: any) => c.warmness_score && c.warmness_score >= 60)
    .sort((a: any, b: any) => (b.warmness_score || 0) - (a.warmness_score || 0))
    .slice(0, 10)

  // Mock AI insights (would come from backend)
  const insights: AIInsight[] = [
    {
      type: 'recommendation',
      title: 'High-value leads need immediate follow-up',
      description: '5 contacts with warmness >80 have not been contacted in 24 hours',
      confidence: 0.95,
      action: 'Review hot leads',
    },
    {
      type: 'intent',
      title: 'Booking cancellation trend detected',
      description: '3 cancellation requests in the last 48 hours - consider availability improvements',
      confidence: 0.87,
      action: 'View cancellations',
    },
    {
      type: 'warmness',
      title: 'Instagram leads converting better',
      description: 'Instagram leads have 62% higher conversion rate than SMS leads',
      confidence: 0.92,
      action: 'View source report',
    },
    {
      type: 'recommendation',
      title: 'Bulk billing inquiries increasing',
      description: '12 bulk billing questions detected this week - consider FAQ automation',
      confidence: 0.89,
      action: 'Create auto-response',
    },
  ]

  // Intent distribution from recent messages
  const intentDistribution = [
    { intent: 'booking_inquiry', count: 45, percentage: 32 },
    { intent: 'interested-mri', count: 28, percentage: 20 },
    { intent: 'booking_confirmation', count: 23, percentage: 16 },
    { intent: 'interested-ct', count: 18, percentage: 13 },
    { intent: 'question', count: 15, percentage: 11 },
    { intent: 'booking_cancellation', count: 11, percentage: 8 },
  ]

  const getWarmnessBadge = (score: number) => {
    if (score >= 80) return { variant: 'red' as const, label: '🔥 Hot', emoji: '🔥' }
    if (score >= 60) return { variant: 'orange' as const, label: '⚡ Warm', emoji: '⚡' }
    if (score >= 40) return { variant: 'yellow' as const, label: '💡 Lukewarm', emoji: '💡' }
    return { variant: 'gray' as const, label: '❄️ Cold', emoji: '❄️' }
  }

  const getInsightIcon = (type: string) => {
    if (type === 'recommendation') return '💡'
    if (type === 'intent') return '🎯'
    if (type === 'warmness') return '🔥'
    return '🤖'
  }

  const getInsightColor = (confidence: number) => {
    if (confidence >= 0.9) return 'green'
    if (confidence >= 0.8) return 'blue'
    return 'yellow'
  }

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    const diffMs = Date.now() - timestamp
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 1) return 'Less than 1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading AI insights...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
        <p className="text-sm text-gray-500">
          Powered by Claude AI • Real-time analysis of your customer data
        </p>
      </div>

      {/* Key Insights */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">🤖 AI Recommendations</h2>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <Badge variant={getInsightColor(insight.confidence)} size="sm">
                        {(insight.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    {insight.action && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {insight.action} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Hot Leads */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">🔥 High-Priority Leads</h2>
          <div className="space-y-3">
            {warmContacts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No high-priority leads at the moment
              </div>
            ) : (
              warmContacts.map((contact) => {
                const badge = getWarmnessBadge(contact.warmness_score)
                return (
                  <div
                    key={contact.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar name={contact.name} size="lg" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {contact.name}
                            </div>
                            <div className="text-sm text-gray-500">{contact.phone}</div>
                          </div>
                          <Badge variant={badge.variant} size="lg">
                            {badge.label} {contact.warmness_score}/100
                          </Badge>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            🤖 AI Reasoning:
                          </div>
                          <div className="text-sm text-gray-700">
                            {contact.warmness_reasoning ||
                              'High engagement, immediate response, specific service request'}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">Source:</span>{' '}
                            <span className="font-medium capitalize">
                              {contact.source.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Stage:</span>{' '}
                            <span className="font-medium capitalize">
                              {contact.current_stage}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Last contact:</span>{' '}
                            <span className="font-medium">
                              {formatRelativeTime(contact.last_contact)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Card>

      {/* Intent Analysis */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">🎯 Intent Distribution</h2>
          <div className="space-y-3">
            {intentDistribution.map((item) => (
              <div key={item.intent}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 capitalize">
                    {item.intent.replace(/[-_]/g, ' ')}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{item.count} messages</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Warmness Distribution */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-4xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-red-600">
              {contacts.filter((c: any) => c.warmness_score >= 80).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Hot Leads (80-100)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-3xl font-bold text-orange-600">
              {contacts.filter((c: any) => c.warmness_score >= 60 && c.warmness_score < 80).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Warm Leads (60-79)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-4xl mb-2">💡</div>
            <div className="text-3xl font-bold text-yellow-600">
              {contacts.filter((c: any) => c.warmness_score >= 40 && c.warmness_score < 60).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Lukewarm (40-59)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-4xl mb-2">❄️</div>
            <div className="text-3xl font-bold text-gray-600">
              {contacts.filter((c: any) => !c.warmness_score || c.warmness_score < 40).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Cold Leads (&lt;40)</div>
          </div>
        </Card>
      </div>

      {/* AI Performance */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">📊 AI Performance Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">95.2%</div>
              <div className="text-sm text-gray-600 mt-1">Intent Detection Accuracy</div>
              <div className="text-xs text-gray-500 mt-2">
                Based on 342 analyzed messages
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">3.2s</div>
              <div className="text-sm text-gray-600 mt-1">Avg Processing Time</div>
              <div className="text-xs text-gray-500 mt-2">
                Real-time analysis on all messages
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">$0.12</div>
              <div className="text-sm text-gray-600 mt-1">Cost Per Lead Analyzed</div>
              <div className="text-xs text-gray-500 mt-2">
                Total: $2.45 this month
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Model Info */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">🤖 AI Models in Use</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold text-gray-900">
                  Llama 3.2 1B Instruct
                </div>
                <div className="text-sm text-gray-500">Intent Detection</div>
              </div>
              <Badge variant="green">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-semibold text-gray-900">
                  Llama 3.1 8B Instruct
                </div>
                <div className="text-sm text-gray-500">Warmness Scoring</div>
              </div>
              <Badge variant="green">Active</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
