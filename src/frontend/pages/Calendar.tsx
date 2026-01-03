import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Filter, Clock, User, Calendar as CalendarIcon, X } from 'lucide-react'
import { getBookings } from '../lib/api'
import { useStaff, useContacts } from '../hooks/useAPI'
import { Card } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

interface CalendarEvent {
  id: string
  title: string
  contact_id: string
  contact_name: string
  service_type: string
  start_time: number
  end_time: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  staff_id?: string
  staff_name?: string
  notes?: string
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')

  // Fetch data
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getBookings(),
  })

  const { data: staff = [] } = useStaff()
  const { data: contacts = [] } = useContacts()

  // Convert bookings to calendar events
  const allEvents: CalendarEvent[] = (Array.isArray(bookings) ? bookings : []).map((booking: any) => ({
    id: booking.id,
    title: `${booking.service_type} - ${booking.contact_name}`,
    contact_id: booking.contact_id,
    contact_name: booking.contact_name,
    service_type: booking.service_type,
    start_time: booking.scheduled_at,
    end_time: booking.scheduled_at + (60 * 60 * 1000), // 1 hour appointments
    status: booking.status,
    staff_id: booking.staff_id,
    staff_name: booking.staff_name,
    notes: booking.notes,
  }))

  // Filter events
  const events = allEvents.filter(event => {
    if (staffFilter !== 'all' && event.staff_id !== staffFilter) return false
    if (serviceFilter !== 'all' && event.service_type !== serviceFilter) return false
    return true
  })

  // Get unique service types
  const serviceTypes = Array.from(new Set(allEvents.map(e => e.service_type)))

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

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    // Last day of month
    const lastDay = new Date(year, month + 1, 0)

    // Start from Sunday before first day
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    // Generate 42 days (6 weeks) for complete month view
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      return day
    })
  }

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date).setHours(0, 0, 0, 0)
    const dayEnd = new Date(date).setHours(23, 59, 59, 999)

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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowCreateModal(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const statusColors = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'danger',
  } as const

  const getServiceColor = (serviceType: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500']
    const index = serviceTypes.indexOf(serviceType) % colors.length
    return colors[index]
  }

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
          {/* Create Booking */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Button>

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
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Staff Filter */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Staff</option>
            {staff.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>

          {/* Service Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Services</option>
            {serviceTypes.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(staffFilter !== 'all' || serviceFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStaffFilter('all')
                setServiceFilter('all')
              }}
            >
              Clear Filters
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            Showing {events.length} of {allEvents.length} appointments
          </div>
        </div>
      </Card>

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
                  onClick={() => handleDateClick(day)}
                >
                  {/* Day Header */}
                  <div className="mb-3 pb-2 border-b cursor-pointer hover:bg-gray-50 rounded p-2 -m-2">
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
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick(event)
                          }}
                          className={`p-2 rounded-lg text-xs border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                            event.status === 'confirmed'
                              ? 'bg-blue-50 border-blue-500'
                              : event.status === 'completed'
                              ? 'bg-green-50 border-green-500'
                              : event.status === 'pending'
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-red-50 border-red-500'
                          }`}
                        >
                          <div className="font-semibold text-gray-900 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(event.start_time)}
                          </div>
                          <div className="mt-1 text-gray-700 font-medium">
                            {event.service_type}
                          </div>
                          <div className="text-gray-600 truncate">
                            {event.contact_name}
                          </div>
                          {event.staff_name && (
                            <div className="text-gray-500 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {event.staff_name}
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
                            onClick={() => handleEventClick(event)}
                            className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
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
                                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {event.staff_name}
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
            {/* Month Header */}
            <div className="text-center text-xl font-bold mb-4">
              {currentDate.toLocaleDateString('en-AU', {
                month: 'long',
                year: 'numeric',
              })}
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {getMonthDays().map((day, index) => {
                const isToday = day.toDateString() === new Date().toDateString()
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const dayEvents = getEventsForDay(day)

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`min-h-[120px] bg-white p-2 cursor-pointer hover:bg-gray-50 ${
                      isToday ? 'bg-blue-50' : ''
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    {/* Date */}
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday
                          ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {day.getDate()}
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick(event)
                          }}
                          className={`text-xs p-1 rounded truncate ${getServiceColor(event.service_type)} text-white`}
                        >
                          {formatTime(event.start_time)} {event.service_type}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-yellow-600">
              {events.filter((e) => e.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-blue-600">
              {events.filter((e) => e.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-500">Confirmed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-green-600">
              {events.filter((e) => e.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </Card>
        <Card>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-gray-900">
              {events.length}
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </Card>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Appointment Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Service</label>
                  <p className="mt-1 text-lg font-semibold">{selectedEvent.service_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={statusColors[selectedEvent.status]} size="lg">
                      {selectedEvent.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="mt-1">{selectedEvent.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Staff</label>
                  <p className="mt-1">{selectedEvent.staff_name || 'Unassigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1">
                    {new Date(selectedEvent.start_time).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="mt-1">{formatTime(selectedEvent.start_time)}</p>
                </div>
              </div>

              {selectedEvent.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 text-gray-700">{selectedEvent.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Button variant="primary">Edit Booking</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Create New Booking</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setSelectedDate(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-600">
                {selectedDate
                  ? `Creating booking for ${selectedDate.toLocaleDateString('en-AU')}`
                  : 'New booking form coming soon...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Use the Bookings page to create new appointments for now.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setSelectedDate(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
