import { HTMLAttributes, forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react'

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'info' | 'ai'
  title: string
  description?: string
  duration?: number
  onClose?: () => void
}

const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'info', title, description, duration = 5000, onClose, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
      if (duration) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          onClose?.()
        }, duration)
        return () => clearTimeout(timer)
      }
    }, [duration, onClose])

    const variants = {
      success: {
        bg: 'bg-success-50 border-success-200',
        icon: <CheckCircle2 className="w-5 h-5 text-success-600" />,
        text: 'text-success-900',
      },
      error: {
        bg: 'bg-danger-50 border-danger-200',
        icon: <AlertCircle className="w-5 h-5 text-danger-600" />,
        text: 'text-danger-900',
      },
      info: {
        bg: 'bg-primary-50 border-primary-200',
        icon: <Info className="w-5 h-5 text-primary-600" />,
        text: 'text-primary-900',
      },
      ai: {
        bg: 'bg-gradient-to-r from-ai-50 to-primary-50 border-ai-200',
        icon: <Sparkles className="w-5 h-5 text-ai-600 animate-pulse" />,
        text: 'text-ai-900',
      },
    }

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-lg border shadow-soft-lg animate-slide-in-right',
          variants[variant].bg,
          className
        )}
        {...props}
      >
        {variants[variant].icon}
        <div className="flex-1">
          <p className={cn('font-semibold text-sm', variants[variant].text)}>{title}</p>
          {description && (
            <p className={cn('text-sm mt-1 opacity-90', variants[variant].text)}>{description}</p>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            onClose?.()
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
)

Toast.displayName = 'Toast'

export default Toast
