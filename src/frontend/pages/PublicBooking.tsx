import React from 'react'
import { Calendar, Clock, User, Mail, Phone, Check, AlertCircle, Loader2, DollarSign, Tag, ChevronLeft } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize Stripe (you'll need to set STRIPE_PUBLISHABLE_KEY)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

type Step = 'procedure' | 'datetime' | 'contact' | 'payment' | 'confirmation'

interface Procedure {
  id: string
  name: string
  description: string
  duration_minutes: number
  base_price: number
  category: string
}

interface TimeSlot {
  time: string
  available: boolean
}

interface BookingData {
  procedure_id: string
  procedure_name: string
  procedure_price: number
  date: string
  time: string
  name: string
  email: string
  phone: string
  notes: string
  discount_code: string
  discount_amount: number
  final_price: number
  influencer_id?: string
}

export default function PublicBooking() {
  return (
    <Elements stripe={stripePromise}>
      <BookingFlow />
    </Elements>
  )
}

function BookingFlow() {
  const [step, setStep] = React.useState<Step>('procedure')
  const [procedures, setProcedures] = React.useState<Procedure[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [bookingData, setBookingData] = React.useState<BookingData>({
    procedure_id: '',
    procedure_name: '',
    procedure_price: 0,
    date: '',
    time: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
    discount_code: '',
    discount_amount: 0,
    final_price: 0
  })

  // Load procedures
  React.useEffect(() => {
    const loadProcedures = async () => {
      try {
        const response = await fetch('/api/procedures?active_only=true')
        const result = await response.json()
        setProcedures(result.data || [])
      } catch (err) {
        console.error('Failed to load procedures:', err)
      }
    }
    loadProcedures()
  }, [])

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }))
  }

  const goBack = () => {
    const steps: Step[] = ['procedure', 'datetime', 'contact', 'payment', 'confirmation']
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1])
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean minimal container for iframe embedding */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Clean minimal content - no decorative elements */}
        <div className="bg-white p-6">
          {step !== 'procedure' && step !== 'confirmation' && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {step === 'procedure' && (
            <ProcedureStep
              procedures={procedures}
              selected={bookingData.procedure_id}
              onSelect={(proc) => {
                updateBookingData({
                  procedure_id: proc.id,
                  procedure_name: proc.name,
                  procedure_price: proc.base_price,
                  final_price: proc.base_price
                })
                setStep('datetime')
              }}
            />
          )}

          {step === 'datetime' && (
            <DateTimeStep
              procedureName={bookingData.procedure_name}
              onSelect={(date, time) => {
                updateBookingData({ date, time })
                setStep('contact')
              }}
            />
          )}

          {step === 'contact' && (
            <ContactStep
              data={bookingData}
              onChange={updateBookingData}
              onNext={() => setStep('payment')}
            />
          )}

          {step === 'payment' && (
            <PaymentStep
              bookingData={bookingData}
              onUpdate={updateBookingData}
              onSuccess={(bookingId) => {
                updateBookingData({ ...bookingData, procedure_id: bookingId })
                setStep('confirmation')
              }}
              onError={setError}
            />
          )}

          {step === 'confirmation' && (
            <ConfirmationStep bookingData={bookingData} />
          )}
        </div>
      </div>
    </div>
  )
}

// Step 1: Select Procedure
function ProcedureStep({ procedures, selected, onSelect }: {
  procedures: Procedure[]
  selected: string
  onSelect: (proc: Procedure) => void
}) {
  const grouped = procedures.reduce((acc, proc) => {
    const cat = proc.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(proc)
    return acc
  }, {} as Record<string, Procedure[]>)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Service</h2>
      <p className="text-gray-600 mb-6">Choose the procedure you'd like to book</p>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Loading services...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map(category => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>
              <div className="grid gap-4">
                {grouped[category].map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => onSelect(proc)}
                    className={`
                      text-left p-4 rounded-lg border-2 transition-all hover:shadow-md
                      ${selected === proc.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{proc.name}</h4>
                        {proc.description && (
                          <p className="text-sm text-gray-600 mt-1">{proc.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {proc.duration_minutes} mins
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${proc.base_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Step 2: Select Date & Time (with CRM calendar availability check)
function DateTimeStep({ procedureName, onSelect }: {
  procedureName: string
  onSelect: (date: string, time: string) => void
}) {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = React.useState<TimeSlot[]>([])
  const [loading, setLoading] = React.useState(false)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // Generate calendar days
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

  // Check availability against CRM calendar
  const checkAvailability = async (date: Date) => {
    setLoading(true)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await fetch(`/api/bookings/availability?date=${dateStr}`)
      const { available_slots } = await response.json()

      const slots: TimeSlot[] = []
      for (let hour = 9; hour < 17; hour++) {
        for (let minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          slots.push({
            time,
            available: available_slots ? available_slots.includes(time) : true
          })
        }
      }

      setAvailableSlots(slots)
    } catch (err) {
      console.error('Failed to check availability:', err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (selectedDate) {
      checkAvailability(selectedDate)
    }
  }, [selectedDate])

  const handleDateSelect = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date >= today && date.getMonth() === currentDate.getMonth()) {
      setSelectedDate(date)
      setSelectedTime(null)
    }
  }

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onSelect(selectedDate.toISOString().split('T')[0], selectedTime)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
      <p className="text-gray-600 mb-6">For: {procedureName}</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ‹
            </button>
            <h3 className="font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {getMonthDays().map((date, i) => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const isPast = date < today
              const isCurrentMonth = date.getMonth() === currentDate.getMonth()
              const isSelected = selectedDate?.toDateString() === date.toDateString()

              return (
                <button
                  key={i}
                  onClick={() => handleDateSelect(date)}
                  disabled={isPast || !isCurrentMonth}
                  className={`
                    aspect-square p-2 text-sm rounded transition-colors
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                    ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                    ${!isPast && isCurrentMonth && !isSelected ? 'hover:bg-blue-50' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <h3 className="font-semibold mb-4">Available Times</h3>
          {!selectedDate ? (
            <p className="text-gray-500 text-sm">Please select a date first</p>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {availableSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={`
                    p-3 rounded border text-sm font-medium transition-colors
                    ${!slot.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
                    ${slot.available && selectedTime === slot.time ? 'bg-blue-600 text-white border-blue-600' : ''}
                    ${slot.available && selectedTime !== slot.time ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50' : ''}
                  `}
                >
                  {slot.time}
                  {!slot.available && <div className="text-xs">Booked</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDate && selectedTime && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue to Your Details
          </button>
        </div>
      )}
    </div>
  )
}

// Step 3: Contact Details
function ContactStep({ data, onChange, onNext }: {
  data: BookingData
  onChange: (updates: Partial<BookingData>) => void
  onNext: () => void
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Details</h2>
      <p className="text-gray-600 mb-6">Please provide your contact information</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={data.name}
              onChange={e => onChange({ name: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={data.email}
              onChange={e => onChange({ email: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={data.phone}
              onChange={e => onChange({ phone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            value={data.notes}
            onChange={e => onChange({ notes: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Any additional information we should know..."
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      </form>
    </div>
  )
}

// Step 4: Payment (with Stripe and discount codes)
function PaymentStep({ bookingData, onUpdate, onSuccess, onError }: {
  bookingData: BookingData
  onUpdate: (updates: Partial<BookingData>) => void
  onSuccess: (bookingId: string) => void
  onError: (error: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = React.useState(false)
  const [discountCodeInput, setDiscountCodeInput] = React.useState('')
  const [validatingDiscount, setValidatingDiscount] = React.useState(false)
  const [discountError, setDiscountError] = React.useState('')

  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return

    setValidatingDiscount(true)
    setDiscountError('')

    try {
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput,
          contact_id: 'temp',  // Will be created when booking is finalized
          procedure_id: bookingData.procedure_id,
          purchase_amount: bookingData.procedure_price
        })
      })

      const result = await response.json()

      if (result.data.valid && result.data.discount) {
        const discount = result.data.discount
        let discountAmount = 0

        if (discount.discount_type === 'percentage') {
          discountAmount = (bookingData.procedure_price * discount.discount_value) / 100
          if (discount.max_discount_amount) {
            discountAmount = Math.min(discountAmount, discount.max_discount_amount)
          }
        } else {
          discountAmount = Math.min(discount.discount_value, bookingData.procedure_price)
        }

        const finalPrice = Math.max(0, bookingData.procedure_price - discountAmount)

        onUpdate({
          discount_code: discountCodeInput,
          discount_amount: discountAmount,
          final_price: finalPrice,
          influencer_id: discount.influencer_id
        })
      } else {
        setDiscountError(result.data.error || 'Invalid discount code')
      }
    } catch (err: any) {
      setDiscountError('Failed to validate discount code')
    } finally {
      setValidatingDiscount(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    onError('')

    try {
      // Step 1: Create contact in CRM
      const contactResponse = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          source: 'public_booking',
          tags: ['online_booking'],
          referral_source: bookingData.discount_code ? 'discount_code' : undefined,
          influencer_id: bookingData.influencer_id
        })
      })

      const contactResult = await contactResponse.json()
      const contactId = contactResult.data.id

      // Step 2: Create booking
      const scheduledDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`)
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          contact_name: bookingData.name,
          procedure_id: bookingData.procedure_id,
          procedure_name: bookingData.procedure_name,
          scheduled_at: scheduledDateTime.getTime(),
          base_price: bookingData.procedure_price,
          discount_code: bookingData.discount_code,
          discount_amount: bookingData.discount_amount,
          final_price: bookingData.final_price,
          influencer_id: bookingData.influencer_id,
          status: 'pending',
          payment_status: 'pending',
          notes: bookingData.notes,
          source: 'public_widget'
        })
      })

      const bookingResult = await bookingResponse.json()
      const bookingId = bookingResult.data.id

      // Step 3: Create Stripe payment intent
      const paymentIntentResponse = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          contact_id: contactId,
          amount: bookingData.final_price,
          currency: 'aud',
          discount_code_id: bookingData.discount_code,
          discount_amount: bookingData.discount_amount,
          influencer_id: bookingData.influencer_id,
          metadata: {
            procedure_name: bookingData.procedure_name,
            scheduled_date: bookingData.date,
            scheduled_time: bookingData.time
          }
        })
      })

      const paymentResult = await paymentIntentResponse.json()
      const { clientSecret } = paymentResult.data

      // Step 4: Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone
          }
        }
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(bookingId)
      } else {
        throw new Error('Payment was not successful')
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment</h2>
      <p className="text-gray-600 mb-6">Secure payment powered by Stripe</p>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{bookingData.procedure_name}</span>
            <span>${bookingData.procedure_price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{bookingData.date} at {bookingData.time}</span>
          </div>
          {bookingData.discount_amount > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Discount ({bookingData.discount_code})</span>
              <span>-${bookingData.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-blue-600">${bookingData.final_price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Discount Code */}
      {!bookingData.discount_code && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Have a discount code?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={discountCodeInput}
                onChange={e => setDiscountCodeInput(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter code"
              />
            </div>
            <button
              onClick={handleApplyDiscount}
              disabled={validatingDiscount || !discountCodeInput.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validatingDiscount ? 'Validating...' : 'Apply'}
            </button>
          </div>
          {discountError && (
            <p className="text-sm text-red-600 mt-1">{discountError}</p>
          )}
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="p-4 border border-gray-300 rounded-lg">
            <CardElement options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }} />
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5" />
              Pay ${bookingData.final_price.toFixed(2)}
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your payment information is secure and encrypted
        </p>
      </form>
    </div>
  )
}

// Step 5: Confirmation
function ConfirmationStep({ bookingData }: { bookingData: BookingData }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
      <p className="text-gray-600 mb-8">
        Thank you, {bookingData.name}. Your appointment has been confirmed.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto text-left mb-8">
        <h3 className="font-semibold mb-4">Appointment Details</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-600">Service:</span>
            <div className="font-medium">{bookingData.procedure_name}</div>
          </div>
          <div>
            <span className="text-gray-600">Date & Time:</span>
            <div className="font-medium">{bookingData.date} at {bookingData.time}</div>
          </div>
          <div>
            <span className="text-gray-600">Amount Paid:</span>
            <div className="font-medium text-green-600">${bookingData.final_price.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p>✉️ A confirmation email has been sent to {bookingData.email}</p>
        <p>📱 You will also receive an SMS reminder before your appointment</p>
      </div>

      <div className="mt-8">
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
