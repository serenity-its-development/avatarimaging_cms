import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBookings } from '../lib/api'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

interface CalendarEvent {
  id: string
  title: string
  contact_name: string
  service_type: string
  start_time: number
  end_time: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  staff_name?: string
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')

  // Fetch bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  })

  // Convert bookings to calendar events (ensure bookings is an array)
  const events: CalendarEvent[] = (Array.isArray(bookings) ? bookings : []).map((booking: any) => ({
    id: booking.id,
    title: `${booking.service_type} - ${booking.contact_name}`,
    contact_name: booking.contact_name,
    service_type: booking.service_type,
    start_time: booking.scheduled_at,
    end_time: booking.scheduled_at + (60 * 60 * 1000), // 1 hour appointments
    status: booking.status,
    staff_name: booking.staff_name,
  }))

  // Calendar helpers
  const getWeekDays = () => {
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay()) // Start on Sunday

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      return day
    })
  }

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime()
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime()

    return events.filter(event =>
      event.start_time >= dayStart && event.start_time <= dayEnd
    ).sort((a, b) => a.start_time - b.start_time)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const goToToday = () => setCurrentDate(new Date())
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (view === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }
  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const statusColors = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'danger',
  } as const

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">View and manage appointments</p>
        </div>

        <div className="flex items-center gap-4">
          {/* View Selector */}
          <div className="flex gap-2">
            <Button
              variant={view === 'day' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevious}>
              ← Prev
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext}>
              Next →
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Week View */}
      {view === 'week' && (
        <Card>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {getWeekDays().map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString()
              const dayEvents = getEventsForDay(day)

              return (
                <div
                  key={index}
                  className={`min-h-[500px] bg-white p-3 ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Day Header */}
                  <div className="mb-3 pb-2 border-b">
                    <div className={`text-xs font-medium uppercase text-gray-500`}>
                      {formatDate(day).split(',')[0]}
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-2">
                    {dayEvents.length === 0 ? (
                      <div className="text-xs text-gray-400 italic mt-4">
                        No appointments
                      </div>
                    ) : (
                      dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-2 rounded-lg text-xs border-l-4 ${
                            event.status === 'confirmed'
                              ? 'bg-blue-50 border-blue-500'
                              : event.status === 'completed'
                              ? 'bg-green-50 border-green-500'
                              : event.status === 'pending'
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-red-50 border-red-500'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">
                            {formatTime(event.start_time)}
                          </div>
                          <div className="mt-1 text-gray-700 font-medium">
                            {event.service_type}
                          </div>
                          <div className="text-gray-600 truncate">
                            {event.contact_name}
                          </div>
                          {event.staff_name && (
                            <div className="text-gray-500 mt-1">
                              👤 {event.staff_name}
                            </div>
                          )}
                          <div className="mt-1">
                            <Badge
                              variant={statusColors[event.status]}
                              size="sm"
                            >
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Day View */}
      {view === 'day' && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {currentDate.toLocaleDateString('en-AU', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>

            {/* Time slots */}
            <div className="space-y-1">
              {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => {
                const hourEvents = events.filter((event) => {
                  const eventHour = new Date(event.start_time).getHours()
                  const eventDate = new Date(event.start_time).toDateString()
                  return (
                    eventHour === hour &&
                    eventDate === currentDate.toDateString()
                  )
                })

                return (
                  <div key={hour} className="flex border-b py-4">
                    <div className="w-20 text-sm text-gray-500">
                      {hour}:00
                    </div>
                    <div className="flex-1 space-y-2">
                      {hourEvents.length === 0 ? (
                        <div className="text-sm text-gray-300">—</div>
                      ) : (
                        hourEvents.map((event) => (
                          <div
                            key={event.id}
                            className={`p-3 rounded-lg border-l-4 ${
                              event.status === 'confirmed'
                                ? 'bg-blue-50 border-blue-500'
                                : event.status === 'completed'
                                ? 'bg-green-50 border-green-500'
                                : event.status === 'pending'
                                ? 'bg-yellow-50 border-yellow-500'
                                : 'bg-red-50 border-red-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {event.service_type}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {event.contact_name}
                                </div>
                                {event.staff_name && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    👤 {event.staff_name}
                                  </div>
                                )}
                              </div>
                              <Badge variant={statusColors[event.status]}>
                                {event.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Month View */}
      {view === 'month' && (
        <Card>
          <div className="p-4">
            <div className="text-center text-lg font-bold mb-4">
              {currentDate.toLocaleDateString('en-AU', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="text-center text-gray-500">
              Month view coming soon...
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {events.filter((e) => e.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {events.filter((e) => e.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-500">Confirmed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {events.filter((e) => e.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {events.length}
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
