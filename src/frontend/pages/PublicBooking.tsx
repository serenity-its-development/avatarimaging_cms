import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Mail, Phone, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button, Card } from '../components/ui'
import * as api from '../lib/api'

interface TimeSlot {
  time: string
  timestamp: number
  available: boolean
}

interface BookingForm {
  name: string
  email: string
  phone: string
  service: string
  date: string
  time: string
  notes: string
}

export default function PublicBooking() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select-date' | 'select-time' | 'details' | 'confirmation'>('select-date')
  const [bookingData, setBookingData] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    service: 'Skin Cancer Screening',
    date: '',
    time: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const services = [
    'Skin Cancer Screening',
    'Full Body Skin Check',
    'Mole Mapping',
    'Follow-up Consultation',
    'Dermatology Consultation'
  ]

  // Generate calendar days for month
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      return day
    })
  }

  // Generate time slots for selected date
  const generateTimeSlots = async (date: Date) => {
    setLoading(true)
    try {
      // Check availability from API
      const response = await fetch(`/api/bookings/availability?date=${date.toISOString().split('T')[0]}`)
      const { available_slots } = await response.json()

      // Generate slots for business hours (9 AM - 5 PM)
      const slots: TimeSlot[] = []
      for (let hour = 9; hour < 17; hour++) {
        for (let minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const timestamp = new Date(date)
          timestamp.setHours(hour, minute, 0, 0)

          // Check if slot is available
          const available = available_slots ? available_slots.includes(time) : true

          slots.push({ time, timestamp: timestamp.getTime(), available })
        }
      }

      setAvailableSlots(slots)
    } catch (err) {
      console.error('Error fetching availability:', err)
      // Default to all slots available
      const slots: TimeSlot[] = []
      for (let hour = 9; hour < 17; hour++) {
        for (let minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const timestamp = new Date(date)
          timestamp.setHours(hour, minute, 0, 0)
          slots.push({ time, timestamp: timestamp.getTime(), available: true })
        }
      }
      setAvailableSlots(slots)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    // Only allow future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return

    // Only allow current month dates
    if (date.getMonth() !== currentDate.getMonth()) return

    setSelectedDate(date)
    setBookingData({ ...bookingData, date: date.toISOString().split('T')[0] })
    generateTimeSlots(date)
    setStep('select-time')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setBookingData({ ...bookingData, time })
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Create booking via public API
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: bookingData.name,
          contact_email: bookingData.email,
          contact_phone: bookingData.phone,
          service_type: bookingData.service,
          scheduled_date: bookingData.date,
          scheduled_time: bookingData.time,
          notes: bookingData.notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      setStep('confirmation')
    } catch (err: any) {
      setError(err.message || 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${minute} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.webp" alt="Avatar Imaging" className="h-16" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
          <p className="text-lg text-gray-600">Choose a convenient time for your visit</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'select-date' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {step !== 'select-date' ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'select-time' ? 'bg-blue-600 text-white' :
              ['details', 'confirmation'].includes(step) ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {['details', 'confirmation'].includes(step) ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'details' ? 'bg-blue-600 text-white' :
              step === 'confirmation' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step === 'confirmation' ? <Check className="w-5 h-5" /> : '3'}
            </div>
          </div>
        </div>

        {/* Step 1: Date Selection */}
        {step === 'select-date' && (
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Select a Date
              </h2>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  ← Previous
                </Button>
                <div className="text-xl font-semibold">
                  {currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  Next →
                </Button>
              </div>

              {/* Calendar Grid */}
              <div>
                {/* Days of Week */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {getMonthDays().map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                    const isPast = isPastDate(day)
                    const isTodayDate = isToday(day)

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateSelect(day)}
                        disabled={isPast || !isCurrentMonth}
                        className={`min-h-[80px] bg-white p-2 text-left transition-colors ${
                          isTodayDate ? 'bg-blue-50' : ''
                        } ${
                          !isCurrentMonth ? 'opacity-30' : ''
                        } ${
                          isPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100 cursor-pointer'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          isTodayDate
                            ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}>
                          {day.getDate()}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Time Selection */}
        {step === 'select-time' && (
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  Select a Time
                </h2>
                <Button variant="outline" size="sm" onClick={() => setStep('select-date')}>
                  ← Change Date
                </Button>
              </div>

              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-700">
                  {selectedDate?.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-gray-500 mt-2">Checking availability...</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        slot.available
                          ? 'border-gray-200 hover:border-blue-600 hover:bg-blue-50 cursor-pointer'
                          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-semibold">{formatTime(slot.time)}</div>
                      {!slot.available && <div className="text-xs mt-1">Booked</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 3: Details Form */}
        {step === 'details' && (
          <Card>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  Your Details
                </h2>
                <Button variant="outline" size="sm" onClick={() => setStep('select-time')}>
                  ← Change Time
                </Button>
              </div>

              {/* Booking Summary */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Booking Summary</h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Date:</strong> {selectedDate?.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p><strong>Time:</strong> {selectedTime && formatTime(selectedTime)}</p>
                  <p><strong>Service:</strong> {bookingData.service}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingData.name}
                    onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0400 000 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={bookingData.service}
                    onChange={(e) => setBookingData({ ...bookingData, service: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {services.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any specific concerns or requests?"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('select-time')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Booking...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirmation' && (
          <Card>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-lg text-gray-600 mb-6">
                Your appointment has been successfully booked.
              </p>

              <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Name:</strong> {bookingData.name}</p>
                  <p><strong>Email:</strong> {bookingData.email}</p>
                  <p><strong>Phone:</strong> {bookingData.phone}</p>
                  <p><strong>Service:</strong> {bookingData.service}</p>
                  <p><strong>Date:</strong> {selectedDate?.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p><strong>Time:</strong> {selectedTime && formatTime(selectedTime)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                A confirmation email has been sent to <strong>{bookingData.email}</strong>
              </p>

              <Button
                variant="primary"
                onClick={() => {
                  setStep('select-date')
                  setSelectedDate(null)
                  setSelectedTime(null)
                  setBookingData({
                    name: '',
                    email: '',
                    phone: '',
                    service: 'Skin Cancer Screening',
                    date: '',
                    time: '',
                    notes: ''
                  })
                }}
              >
                Book Another Appointment
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
