import * as React from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
}

export default function Dialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm
}: DialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const typeStyles = {
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      button: 'bg-green-600 hover:bg-green-700'
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-yellow-600" />,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      button: 'bg-red-600 hover:bg-red-700'
    }
  }

  const style = typeStyles[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', style.bg, `border ${style.border}`)}>
              {style.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 rounded-b-lg">
          {onConfirm && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              style.button
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Confirmation dialog hook
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Omit<DialogProps, 'isOpen' | 'onClose'>>({
    title: '',
    message: '',
    type: 'info'
  })
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = (props: Omit<DialogProps, 'isOpen' | 'onClose' | 'onConfirm'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(props)
      setIsOpen(true)
      resolveRef.current = resolve
    })
  }

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false)
    }
    setIsOpen(false)
  }

  const DialogComponent = () => (
    <Dialog
      {...config}
      isOpen={isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
    />
  )

  return { confirm, DialogComponent }
}

// Alert dialog hook (no confirmation needed)
export function useAlertDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Omit<DialogProps, 'isOpen' | 'onClose' | 'onConfirm'>>({
    title: '',
    message: '',
    type: 'info'
  })

  const alert = (props: Omit<DialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
    setConfig(props)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const DialogComponent = () => (
    <Dialog
      {...config}
      isOpen={isOpen}
      onClose={handleClose}
    />
  )

  return { alert, DialogComponent }
}

// Add React import
import * as React from 'react'
