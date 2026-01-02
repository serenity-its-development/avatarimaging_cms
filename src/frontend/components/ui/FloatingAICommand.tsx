import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, Send, Mic, MicOff, X, Minimize2, Maximize2, GripVertical, Palette } from 'lucide-react'
import Button from './Button'
import Toast from './Toast'

interface FloatingAICommandProps {
  onSubmit: (message: string) => Promise<void>
  onDock?: () => void
  isDocked?: boolean
}

export default function FloatingAICommand({ onSubmit, onDock, isDocked = false }: FloatingAICommandProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 400 })
  const [size, setSize] = useState({ width: 400, height: 350 })
  const [opacity, setOpacity] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showOpacitySlider, setShowOpacitySlider] = useState(false)

  const recognitionRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setMessage(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setToastMessage('Voice recognition failed. Please try again.')
        setShowToast(true)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setIsMinimized(false)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Load saved settings from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('ai-command-position')
    const savedSize = localStorage.getItem('ai-command-size')
    const savedOpacity = localStorage.getItem('ai-command-opacity')

    if (savedPosition) setPosition(JSON.parse(savedPosition))
    if (savedSize) setSize(JSON.parse(savedSize))
    if (savedOpacity) setOpacity(JSON.parse(savedOpacity))
  }, [])

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('ai-command-position', JSON.stringify(position))
    localStorage.setItem('ai-command-size', JSON.stringify(size))
    localStorage.setItem('ai-command-opacity', JSON.stringify(opacity))
  }

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSubmit(message)
      setMessage('')
      setToastMessage('AI command executed successfully!')
      setShowToast(true)
    } catch (error) {
      setToastMessage('Failed to execute AI command')
      setShowToast(true)
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

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setToastMessage('Voice input not supported in this browser')
      setShowToast(true)
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        // Check if dragging to left edge (dock zone)
        if (newX < 80 && containerRef.current) {
          containerRef.current.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.4)'
        } else if (containerRef.current) {
          containerRef.current.style.boxShadow = ''
        }

        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - size.width)),
          y: Math.max(0, Math.min(newY, window.innerHeight - size.height)),
        })
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        setSize({
          width: Math.max(300, Math.min(800, resizeStart.width + deltaX)),
          height: Math.max(250, Math.min(600, resizeStart.height + deltaY)),
        })
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const finalX = e.clientX - dragOffset.x

        // Dock to sidebar if dropped near left edge
        if (finalX < 80 && onDock) {
          onDock()
          setToastMessage('AI Command docked to sidebar!')
          setShowToast(true)
        } else {
          saveSettings()
        }

        setIsDragging(false)
        if (containerRef.current) {
          containerRef.current.style.boxShadow = ''
        }
      }

      if (isResizing) {
        setIsResizing(false)
        saveSettings()
      }
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, position, size, resizeStart, onDock])

  if (!isOpen && !isDocked) {
    return (
      <>
        {/* Floating trigger button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-ai-500 to-primary-600 text-white rounded-full shadow-soft-xl hover:shadow-soft-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50"
          title="Open AI Command (Cmd+K)"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-danger-500 rounded-full text-xs font-bold flex items-center justify-center animate-pulse">
            AI
          </span>
        </button>

        {showToast && (
          <div className="fixed bottom-24 right-6 z-50">
            <Toast
              variant="ai"
              title={toastMessage}
              onClose={() => setShowToast(false)}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && !isDocked && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setIsOpen(false)} />
      )}

      {/* Floating AI Command Box */}
      <div
        ref={containerRef}
        style={!isDocked ? {
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          opacity: opacity / 100,
          zIndex: 50,
          transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
        } : {}}
        className={cn(
          'bg-white rounded-xl shadow-soft-xl border-2 border-ai-200 animate-scale-in flex flex-col',
          (isDragging || isResizing) && 'select-none',
          isDocked && 'w-full'
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Header with drag handle */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-ai-50 to-primary-50 rounded-t-xl border-b border-ai-200 drag-handle cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical className="w-5 h-5 text-ai-400" />
          <Sparkles className="w-5 h-5 text-ai-600" />
          <span className="flex-1 font-semibold text-ai-900 text-sm">AI Command</span>

          {/* Opacity slider toggle */}
          <button
            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            className="p-1 hover:bg-ai-100 rounded transition-colors"
            title="Adjust transparency"
          >
            <Palette className="w-4 h-4 text-ai-600" />
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-ai-100 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 text-ai-600" /> : <Minimize2 className="w-4 h-4 text-ai-600" />}
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-danger-100 rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Opacity Slider */}
        {showOpacitySlider && !isMinimized && (
          <div className="px-4 py-3 bg-gradient-to-r from-ai-50/50 to-primary-50/50 border-b border-ai-100 flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-medium text-ai-700">Transparency</span>
            <input
              type="range"
              min="30"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              onMouseUp={saveSettings}
              className="flex-1 h-2 bg-ai-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ai-600 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs font-semibold text-ai-600 w-10 text-right">{opacity}%</span>
          </div>
        )}

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
            {/* Hint text */}
            <p className="text-xs text-gray-500">
              💡 Drag to move • Resize from corner • Drop on sidebar to dock • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Cmd+K</kbd>
            </p>

            {/* Input area */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Ask AI or give a command..."}
                  disabled={isLoading || isListening}
                  className={cn(
                    "w-full px-4 py-3 pr-12 bg-gray-50 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-500 focus:bg-white transition-all",
                    isListening ? "border-danger-300 animate-pulse" : "border-gray-200"
                  )}
                  autoFocus
                />

                {/* Voice button */}
                <button
                  onClick={toggleVoiceInput}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                    isListening
                      ? "bg-danger-100 text-danger-600 animate-pulse"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  title={isListening ? "Stop listening (voice input)" : "Start voice input"}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Send button */}
              <Button
                onClick={handleSubmit}
                isLoading={isLoading}
                disabled={!message.trim() || isListening}
                className="bg-ai-600 hover:bg-ai-700 focus:ring-ai-500 px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick commands */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase">Quick Commands</p>
              <div className="flex flex-wrap gap-2">
                {['Show hot leads', 'My tasks today', 'Generate report', 'Find contacts', 'Pipeline overview', 'Top performers'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setMessage(cmd)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-ai-50 text-xs rounded-md transition-colors text-gray-700 hover:text-ai-700"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resize handle */}
        {!isDocked && !isMinimized && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize group"
            title="Drag to resize"
          >
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-ai-300 group-hover:border-ai-500 transition-colors" />
          </div>
        )}
      </div>

      {/* Toast notifications */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast
            variant="ai"
            title={toastMessage}
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </>
  )
}
