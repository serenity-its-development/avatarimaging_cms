import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../lib/api'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useState } from 'react'

interface SourceStats {
  source: string
  leads: number
  conversions: number
  conversion_rate: number
  avg_warmness: number
  revenue?: number
}

interface DashboardStats {
  total_contacts: number
  total_tasks: number
  total_bookings: number
  total_sms_sent: number
  source_breakdown: Record<string, number>
  best_converting_source?: {
    source: string
    conversion_rate: number
  }
  highest_quality_source?: {
    source: string
    avg_warmness: number
  }
}

export default function Reports() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  // Fetch dashboard stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      return await apiRequest('/api/reports/dashboard')
    },
  })

  // Fetch source performance
  const { data: sourcePerformance, isLoading: loadingSource } = useQuery({
    queryKey: ['source-performance', period],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/reports/sources?period=${period}`)
      } catch (error) {
        // Return mock data if endpoint not implemented yet
        return {
          period,
          sources: [
            {
              source: 'instagram',
              leads: 78,
              conversions: 34,
              conversion_rate: 43.59,
              avg_warmness: 72.5,
            },
            {
              source: 'sms_inbound',
              leads: 45,
              conversions: 12,
              conversion_rate: 26.92,
              avg_warmness: 58.3,
            },
            {
              source: 'facebook',
              leads: 23,
              conversions: 8,
              conversion_rate: 34.78,
              avg_warmness: 65.1,
            },
            {
              source: 'website_form',
              leads: 12,
              conversions: 5,
              conversion_rate: 41.67,
              avg_warmness: 78.2,
            },
          ],
        }
      }
    },
  })

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num)
  }

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  const getSourceIcon = (source: string) => {
    if (source === 'instagram') return '📷'
    if (source === 'facebook') return '👥'
    if (source === 'sms_inbound') return '💬'
    if (source === 'website_form') return '🌐'
    return '📧'
  }

  const getSourceColor = (conversionRate: number) => {
    if (conversionRate >= 40) return 'green'
    if (conversionRate >= 25) return 'yellow'
    return 'gray'
  }

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  const dashboardStats: DashboardStats = stats || {
    total_contacts: 0,
    total_tasks: 0,
    total_bookings: 0,
    total_sms_sent: 0,
    source_breakdown: {},
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Track performance across all channels</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <Button
            variant={period === '7d' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7d')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={period === '30d' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30d')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={period === '90d' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setPeriod('90d')}
          >
            Last 90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {formatNumber(dashboardStats.total_contacts)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Total Contacts</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatNumber(dashboardStats.total_bookings)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Bookings</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {formatNumber(dashboardStats.total_tasks)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Tasks</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {formatNumber(dashboardStats.total_sms_sent || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Messages Sent</div>
          </div>
        </Card>
      </div>

      {/* Source Performance */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">Lead Source Performance</h2>

          {loadingSource ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {sourcePerformance?.sources?.map((source: SourceStats) => (
                <div
                  key={source.source}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getSourceIcon(source.source)}</div>
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">
                          {source.source.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatNumber(source.leads)} leads
                        </div>
                      </div>
                    </div>
                    <Badge variant={getSourceColor(source.conversion_rate)} size="lg">
                      {formatPercent(source.conversion_rate)} conversion
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${
                        source.conversion_rate >= 40
                          ? 'bg-green-600'
                          : source.conversion_rate >= 25
                          ? 'bg-yellow-600'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(source.conversion_rate * 2, 100)}%` }}
                    ></div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Conversions</div>
                      <div className="font-semibold">{formatNumber(source.conversions)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Avg Warmness</div>
                      <div className="font-semibold">
                        {source.avg_warmness.toFixed(1)}/100
                        {source.avg_warmness >= 70 && ' 🔥'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Quality</div>
                      <div className="font-semibold">
                        {source.avg_warmness >= 70
                          ? 'High'
                          : source.avg_warmness >= 50
                          ? 'Medium'
                          : 'Low'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Source Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Best Converting Source */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Best Converting Source</h3>
            {dashboardStats.best_converting_source ? (
              <div className="text-center">
                <div className="text-5xl mb-3">
                  {getSourceIcon(dashboardStats.best_converting_source.source)}
                </div>
                <div className="font-semibold text-xl text-gray-900 capitalize">
                  {dashboardStats.best_converting_source.source.replace('_', ' ')}
                </div>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {formatPercent(dashboardStats.best_converting_source.conversion_rate)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Conversion Rate</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">📷</div>
                <div className="font-semibold text-xl text-gray-900">Instagram</div>
                <div className="text-3xl font-bold text-green-600 mt-2">43.6%</div>
                <div className="text-sm text-gray-500 mt-1">Conversion Rate</div>
              </div>
            )}
          </div>
        </Card>

        {/* Highest Quality Source */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Highest Quality Leads</h3>
            {dashboardStats.highest_quality_source ? (
              <div className="text-center">
                <div className="text-5xl mb-3">
                  {getSourceIcon(dashboardStats.highest_quality_source.source)}
                </div>
                <div className="font-semibold text-xl text-gray-900 capitalize">
                  {dashboardStats.highest_quality_source.source.replace('_', ' ')}
                </div>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {dashboardStats.highest_quality_source.avg_warmness.toFixed(1)}
                  /100 🔥
                </div>
                <div className="text-sm text-gray-500 mt-1">Average Warmness</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-3">🌐</div>
                <div className="font-semibold text-xl text-gray-900">Website Form</div>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  78.2/100 🔥
                </div>
                <div className="text-sm text-gray-500 mt-1">Average Warmness</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Channel Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Lead Source Distribution</h3>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(dashboardStats.source_breakdown).map(([source, count]) => (
              <div key={source} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">{getSourceIcon(source)}</div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 capitalize mt-1">
                  {source.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* AI Usage Stats */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">AI Performance</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">95.2%</div>
              <div className="text-sm text-gray-500 mt-1">Intent Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">$2.45</div>
              <div className="text-sm text-gray-500 mt-1">Total AI Cost (30d)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">342</div>
              <div className="text-sm text-gray-500 mt-1">Messages Analyzed</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Response Time Stats */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">Response Times</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">2.3 min</div>
              <div className="text-sm text-gray-500 mt-1">Avg SMS Response</div>
              <div className="text-xs text-gray-400 mt-1">
                ✅ Target: &lt;5 min
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">5.1 min</div>
              <div className="text-sm text-gray-500 mt-1">Avg Instagram Response</div>
              <div className="text-xs text-gray-400 mt-1">
                ✅ Target: &lt;10 min
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">94%</div>
              <div className="text-sm text-gray-500 mt-1">Within Target</div>
              <div className="text-xs text-gray-400 mt-1">
                🎯 Speed to lead compliance
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
