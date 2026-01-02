import { useState, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import Button from './Button'

export interface AIInputProps {
  onSubmit: (message: string) => Promise<void>
  placeholder?: string
  className?: string
}

export default function AIInput({ onSubmit, placeholder = 'Ask AI anything...', className }: AIInputProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSubmit(message)
      setMessage('')
    } catch (error) {
      console.error('AI input error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-ai-50 to-primary-50 rounded-lg border-2 border-ai-200 shadow-soft">
        <Sparkles className="w-5 h-5 text-ai-600 flex-shrink-0" />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-ai-400 text-sm"
        />
        <Button
          size="sm"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!message.trim()}
          className="bg-ai-600 hover:bg-ai-700 focus:ring-ai-500"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
