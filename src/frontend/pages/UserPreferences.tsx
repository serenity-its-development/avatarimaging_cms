import { useState } from 'react'
import {
  Settings,
  Palette,
  Bell,
  Layout,
  Calendar as CalendarIcon,
  MessageSquare,
  Keyboard,
  Globe,
  Eye,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle,
} from 'lucide-react'
import { usePreferencesContext } from '../contexts/PreferencesContext'
import { useResetPreferences } from '../hooks/useAPI'
import * as api from '../lib/api'
import { Button, Toast, useConfirmDialog } from '../components/ui'

export default function UserPreferences() {
  const { confirm, DialogComponent: ConfirmDialog } = useConfirmDialog()
  const { preferences, updatePreferences } = usePreferencesContext()
  const resetMutation = useResetPreferences()

  const [activeTab, setActiveTab] = useState('appearance')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success')

  const handleUpdate = async (updates: Partial<api.UserPreferences>) => {
    try {
      await updatePreferences(updates)
      setToastMessage('Preferences updated successfully')
      setToastVariant('success')
      setShowToast(true)
    } catch (error) {
      setToastMessage('Failed to update preferences')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Reset All Preferences',
      message: 'Are you sure you want to reset all preferences to defaults? This will undo all your customizations.',
      type: 'warning',
      confirmText: 'Reset',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      await resetMutation.mutateAsync()
      setToastMessage('Preferences reset to defaults')
      setToastVariant('success')
      setShowToast(true)
    } catch (error) {
      setToastMessage('Failed to reset preferences')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await api.exportPreferences()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `preferences-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToastMessage('Preferences exported successfully')
      setToastVariant('success')
      setShowToast(true)
    } catch (error) {
      setToastMessage('Failed to export preferences')
      setToastVariant('error')
      setShowToast(true)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        await api.importPreferences(text)
        setToastMessage('Preferences imported successfully')
        setToastVariant('success')
        setShowToast(true)
      } catch (error) {
        setToastMessage('Failed to import preferences')
        setToastVariant('error')
        setShowToast(true)
      }
    }
    input.click()
  }

  const tabs = [
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'ai', name: 'AI Assistant', icon: Sparkles },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'dashboard', name: 'Dashboard', icon: Layout },
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon },
    { id: 'messages', name: 'Messages', icon: MessageSquare },
    { id: 'shortcuts', name: 'Shortcuts', icon: Keyboard },
    { id: 'regional', name: 'Regional', icon: Globe },
    { id: 'accessibility', name: 'Accessibility', icon: Eye },
  ]

  if (!preferences) {
    return <div>Loading preferences...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary-600" />
            User Preferences
          </h1>
          <p className="text-gray-600 mt-1">Customize your CRM experience</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleImport} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Appearance Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'auto'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleUpdate({ theme: theme as any })}
                      className={`p-4 border-2 rounded-lg capitalize transition-colors ${
                        preferences.theme === theme
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {theme}
                      {preferences.theme === theme && (
                        <CheckCircle className="w-5 h-5 text-primary-600 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.sidebar_collapsed}
                    onChange={(e) => handleUpdate({ sidebar_collapsed: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Collapse sidebar by default</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default View</label>
                <select
                  value={preferences.default_view}
                  onChange={(e) => handleUpdate({ default_view: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="contacts">Contacts</option>
                  <option value="calendar">Calendar</option>
                  <option value="messages">Messages</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant Settings</h2>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.ai_quick_access_enabled}
                    onChange={(e) => handleUpdate({ ai_quick_access_enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable quick access (Cmd/Ctrl + K)</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.ai_auto_suggestions}
                    onChange={(e) => handleUpdate({ ai_auto_suggestions: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Show AI suggestions automatically</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Temperature: {preferences.ai_temperature?.toFixed(1) || 0.7}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.ai_temperature || 0.7}
                  onChange={(e) => handleUpdate({ ai_temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Context Length</label>
                <div className="grid grid-cols-3 gap-3">
                  {['short', 'medium', 'long'].map((length) => (
                    <button
                      key={length}
                      onClick={() => handleUpdate({ ai_context_length: length as any })}
                      className={`p-3 border-2 rounded-lg capitalize ${
                        preferences.ai_context_length === length
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.desktop_notifications}
                    onChange={(e) => handleUpdate({ desktop_notifications: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Desktop notifications</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications}
                    onChange={(e) => handleUpdate({ email_notifications: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Email notifications</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.sms_notifications}
                    onChange={(e) => handleUpdate({ sms_notifications: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">SMS notifications</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.notification_sound}
                    onChange={(e) => handleUpdate({ notification_sound: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Notification sounds</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Calendar Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default View</label>
                <select
                  value={preferences.calendar_view}
                  onChange={(e) => handleUpdate({ calendar_view: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="agenda">Agenda</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={preferences.calendar_start_time}
                    onChange={(e) => handleUpdate({ calendar_start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={preferences.calendar_end_time}
                    onChange={(e) => handleUpdate({ calendar_end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slot Duration: {preferences.calendar_slot_duration} minutes
                </label>
                <select
                  value={preferences.calendar_slot_duration}
                  onChange={(e) => handleUpdate({ calendar_slot_duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.calendar_show_weekends}
                    onChange={(e) => handleUpdate({ calendar_show_weekends: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Show weekends</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'regional' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => handleUpdate({ language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => handleUpdate({ timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Australia/Sydney">Australia/Sydney</option>
                  <option value="Australia/Melbourne">Australia/Melbourne</option>
                  <option value="Australia/Brisbane">Australia/Brisbane</option>
                  <option value="Australia/Perth">Australia/Perth</option>
                  <option value="Pacific/Auckland">Pacific/Auckland</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select
                  value={preferences.date_format}
                  onChange={(e) => handleUpdate({ date_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                <div className="grid grid-cols-2 gap-3">
                  {['12h', '24h'].map((format) => (
                    <button
                      key={format}
                      onClick={() => handleUpdate({ time_format: format as any })}
                      className={`p-3 border-2 rounded-lg ${
                        preferences.time_format === format
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {format === '12h' ? '12-hour' : '24-hour'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Accessibility Settings</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text Size</label>
                <div className="grid grid-cols-4 gap-3">
                  {['small', 'medium', 'large', 'x-large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleUpdate({ text_size: size as any })}
                      className={`p-3 border-2 rounded-lg capitalize ${
                        preferences.text_size === size
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.high_contrast}
                    onChange={(e) => handleUpdate({ high_contrast: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">High contrast mode</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.reduce_motion}
                    onChange={(e) => handleUpdate({ reduce_motion: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Reduce motion</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.screen_reader_mode}
                    onChange={(e) => handleUpdate({ screen_reader_mode: e.target.checked })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Screen reader optimizations</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setShowToast(false)} />
      )}

      <ConfirmDialog />
    </div>
  )
}
