import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { User, Sliders } from 'lucide-react'

interface SettingsSection {
  title: string
  description: string
  settings: SettingItem[]
}

interface SettingItem {
  id: string
  label: string
  description: string
  type: 'toggle' | 'input' | 'select' | 'secret'
  value?: string | boolean
  options?: { label: string; value: string }[]
  placeholder?: string
}

export default function Settings() {
  const [sections, setSections] = useState<SettingsSection[]>([
    {
      title: 'General Settings',
      description: 'Configure basic application settings',
      settings: [
        {
          id: 'app_name',
          label: 'Application Name',
          description: 'Display name for the CRM',
          type: 'input',
          value: 'Avatar Imaging CRM',
          placeholder: 'Enter app name',
        },
        {
          id: 'environment',
          label: 'Environment',
          description: 'Current deployment environment',
          type: 'select',
          value: 'development',
          options: [
            { label: 'Development', value: 'development' },
            { label: 'Production', value: 'production' },
          ],
        },
        {
          id: 'frontend_url',
          label: 'Frontend URL',
          description: 'URL for CORS configuration',
          type: 'input',
          value: 'http://localhost:5173',
          placeholder: 'https://crm.avatarimaging.com.au',
        },
      ],
    },
    {
      title: 'SMS Integration',
      description: 'Configure SMS provider and settings',
      settings: [
        {
          id: 'sms_provider',
          label: 'SMS Provider',
          description: 'Choose your SMS service provider',
          type: 'select',
          value: 'mobilemessage',
          options: [
            { label: 'MobileMessage.com.au', value: 'mobilemessage' },
            { label: 'ClickSend', value: 'clicksend' },
            { label: 'SendGrid', value: 'sendgrid' },
          ],
        },
        {
          id: 'sms_from_number',
          label: 'From Number',
          description: 'Phone number for outgoing SMS',
          type: 'input',
          value: '+61400000000',
          placeholder: '+61400000000',
        },
        {
          id: 'mobilemessage_api_key',
          label: 'MobileMessage API Key',
          description: 'API key for MobileMessage integration',
          type: 'secret',
          value: '',
          placeholder: 'Enter API key',
        },
        {
          id: 'mobilemessage_webhook_secret',
          label: 'MobileMessage Webhook Secret',
          description: 'Secret for webhook verification',
          type: 'secret',
          value: '',
          placeholder: 'Enter webhook secret',
        },
      ],
    },
    {
      title: 'Instagram/Facebook (ManyChat)',
      description: 'Configure social media messaging integration',
      settings: [
        {
          id: 'manychat_enabled',
          label: 'Enable ManyChat',
          description: 'Activate Instagram/Facebook messaging',
          type: 'toggle',
          value: false,
        },
        {
          id: 'manychat_page_id',
          label: 'Facebook Page ID',
          description: 'Your Facebook Page ID',
          type: 'input',
          value: '',
          placeholder: 'Enter Page ID',
        },
        {
          id: 'manychat_api_key',
          label: 'ManyChat API Key',
          description: 'API key for ManyChat integration',
          type: 'secret',
          value: '',
          placeholder: 'Enter API key',
        },
        {
          id: 'manychat_webhook_secret',
          label: 'ManyChat Webhook Secret',
          description: 'Secret for webhook verification',
          type: 'secret',
          value: '',
          placeholder: 'Enter webhook secret',
        },
      ],
    },
    {
      title: 'Wix Integration',
      description: 'Connect your Wix booking system',
      settings: [
        {
          id: 'wix_site_id',
          label: 'Wix Site ID',
          description: 'Your Wix site identifier',
          type: 'input',
          value: '',
          placeholder: 'Enter Wix Site ID',
        },
        {
          id: 'wix_booking_calendar_id',
          label: 'Booking Calendar ID',
          description: 'Calendar ID for bookings',
          type: 'input',
          value: '',
          placeholder: 'Enter Calendar ID',
        },
        {
          id: 'wix_webhook_secret',
          label: 'Wix Webhook Secret',
          description: 'Secret for webhook verification',
          type: 'secret',
          value: '',
          placeholder: 'Enter webhook secret',
        },
      ],
    },
    {
      title: 'Google OAuth',
      description: 'Configure Google authentication',
      settings: [
        {
          id: 'google_client_id',
          label: 'Google Client ID',
          description: 'OAuth 2.0 Client ID',
          type: 'secret',
          value: '',
          placeholder: 'Enter Client ID',
        },
        {
          id: 'google_client_secret',
          label: 'Google Client Secret',
          description: 'OAuth 2.0 Client Secret',
          type: 'secret',
          value: '',
          placeholder: 'Enter Client Secret',
        },
        {
          id: 'google_oauth_redirect_uri',
          label: 'OAuth Redirect URI',
          description: 'Callback URL for OAuth flow',
          type: 'input',
          value: 'https://avatarimaging-crm.workers.dev/auth/google/callback',
          placeholder: 'https://...',
        },
      ],
    },
    {
      title: 'AI Configuration',
      description: 'Configure Workers AI models and behavior',
      settings: [
        {
          id: 'ai_model_warmness',
          label: 'Warmness Scoring Model',
          description: 'AI model for lead warmness analysis',
          type: 'select',
          value: '@cf/meta/llama-3.1-8b-instruct',
          options: [
            { label: 'Llama 3.1 8B (Recommended)', value: '@cf/meta/llama-3.1-8b-instruct' },
            { label: 'Llama 3.2 1B (Faster)', value: '@cf/meta/llama-3.2-1b-instruct' },
          ],
        },
        {
          id: 'ai_model_intent',
          label: 'Intent Detection Model',
          description: 'AI model for message intent classification',
          type: 'select',
          value: '@cf/meta/llama-3.2-1b-instruct',
          options: [
            { label: 'Llama 3.2 1B (Fast)', value: '@cf/meta/llama-3.2-1b-instruct' },
            { label: 'Llama 3.1 8B (More Accurate)', value: '@cf/meta/llama-3.1-8b-instruct' },
          ],
        },
        {
          id: 'ai_max_tokens',
          label: 'Max Tokens',
          description: 'Maximum tokens per AI response',
          type: 'input',
          value: '256',
          placeholder: '256',
        },
      ],
    },
    {
      title: 'Business Rules',
      description: 'Configure CRM automation rules',
      settings: [
        {
          id: 'warmness_recalc_interval',
          label: 'Warmness Recalculation Interval (hours)',
          description: 'How often to recalculate lead warmness scores',
          type: 'input',
          value: '24',
          placeholder: '24',
        },
        {
          id: 'speed_to_lead_target',
          label: 'Speed-to-Lead Target (minutes)',
          description: 'Target time to respond to new leads',
          type: 'input',
          value: '5',
          placeholder: '5',
        },
      ],
    },
    {
      title: 'Security',
      description: 'Security and authentication settings',
      settings: [
        {
          id: 'session_secret',
          label: 'Session Secret',
          description: 'Secret key for JWT signing',
          type: 'secret',
          value: '',
          placeholder: 'Enter session secret',
        },
      ],
    },
  ])

  const [hasChanges, setHasChanges] = useState(false)
  const [savedNotification, setSavedNotification] = useState(false)

  const handleSettingChange = (sectionIndex: number, settingIndex: number, value: string | boolean) => {
    const newSections = [...sections]
    newSections[sectionIndex].settings[settingIndex].value = value
    setSections(newSections)
    setHasChanges(true)
  }

  const handleSave = () => {
    // TODO: Implement API call to save settings
    console.log('Saving settings...', sections)
    setSavedNotification(true)
    setHasChanges(false)
    setTimeout(() => setSavedNotification(false), 3000)
  }

  const handleReset = () => {
    // TODO: Implement reset to defaults
    setHasChanges(false)
  }

  const renderSettingInput = (
    setting: SettingItem,
    sectionIndex: number,
    settingIndex: number
  ) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) =>
                handleSettingChange(sectionIndex, settingIndex, e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        )

      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) =>
              handleSettingChange(sectionIndex, settingIndex, e.target.value)
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            {setting.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'secret':
        return (
          <div className="relative">
            <input
              type="password"
              value={setting.value as string}
              onChange={(e) =>
                handleSettingChange(sectionIndex, settingIndex, e.target.value)
              }
              placeholder={setting.placeholder}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border font-mono"
            />
            {!(setting.value as string) && (
              <Badge variant="warning" size="sm" className="absolute right-2 top-2">
                Not Set
              </Badge>
            )}
          </div>
        )

      case 'input':
      default:
        return (
          <input
            type="text"
            value={setting.value as string}
            onChange={(e) =>
              handleSettingChange(sectionIndex, settingIndex, e.target.value)
            }
            placeholder={setting.placeholder}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure your CRM integrations and preferences</p>
        </div>

        <div className="flex gap-3">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset Changes
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Save Notification */}
      {savedNotification && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex items-center">
            <span className="text-green-700 font-medium">
              ✓ Settings saved successfully!
            </span>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/settings/preferences">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">User Preferences</h3>
                <p className="text-sm text-gray-600">Customize your personal CRM experience</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/settings/pipelines">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sliders className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pipeline Management</h3>
                <p className="text-sm text-gray-600">Configure sales pipelines and stages</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-400 text-xl">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> Secret values (API keys, tokens) should be set using{' '}
              <code className="bg-yellow-100 px-1 rounded">wrangler secret put SECRET_NAME</code> for
              production deployments. Changes here are for development/preview only.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {sections.map((section, sectionIndex) => (
        <Card key={section.title}>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{section.title}</h2>
            <p className="text-sm text-gray-500 mb-6">{section.description}</p>

            <div className="space-y-6">
              {section.settings.map((setting, settingIndex) => (
                <div key={setting.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium text-gray-700">
                        {setting.label}
                      </label>
                      <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                    </div>

                    {setting.type === 'toggle' ? (
                      <div className="ml-4 flex-shrink-0">
                        {renderSettingInput(setting, sectionIndex, settingIndex)}
                      </div>
                    ) : null}
                  </div>

                  {setting.type !== 'toggle' && (
                    <div className="mt-3">
                      {renderSettingInput(setting, sectionIndex, settingIndex)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {/* Database & Infrastructure Info */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Infrastructure Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">D1 Database</div>
              <div className="font-mono text-sm text-gray-900">avatarimaging-crm-db</div>
              <Badge variant="success" size="sm" className="mt-2">
                Connected
              </Badge>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Queue</div>
              <div className="font-mono text-sm text-gray-900">avatar-queue</div>
              <Badge variant="success" size="sm" className="mt-2">
                Active
              </Badge>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Workers AI</div>
              <div className="font-mono text-sm text-gray-900">Enabled</div>
              <Badge variant="success" size="sm" className="mt-2">
                Ready
              </Badge>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">KV Cache</div>
              <div className="font-mono text-sm text-gray-900">Optional</div>
              <Badge variant="default" size="sm" className="mt-2">
                Not Configured
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
