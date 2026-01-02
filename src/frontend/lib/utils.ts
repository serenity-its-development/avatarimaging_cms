import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getWarmnessColorClass(score: number): string {
  if (score >= 80) return 'text-danger-600 bg-danger-50'
  if (score >= 60) return 'text-warning-600 bg-warning-50'
  if (score >= 40) return 'text-primary-600 bg-primary-50'
  return 'text-gray-600 bg-gray-50'
}

export function getPriorityColorClass(priority: 'urgent' | 'high' | 'medium' | 'low'): string {
  const colors = {
    urgent: 'text-danger-600 bg-danger-50 border-danger-200',
    high: 'text-warning-600 bg-warning-50 border-warning-200',
    medium: 'text-primary-600 bg-primary-50 border-primary-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return colors[priority] || colors.low
}

export function getStatusColorClass(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'text-success-600 bg-success-50 border-success-200',
    completed: 'text-gray-600 bg-gray-50 border-gray-200',
    cancelled: 'text-danger-600 bg-danger-50 border-danger-200',
    pending: 'text-warning-600 bg-warning-50 border-warning-200',
  }
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-50 border-gray-200'
}
