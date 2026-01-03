import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  TrendingUp,
  Calendar,
  MessageSquare,
  Settings,
  Sparkles,
  BarChart3,
  UserCog,
  FileText,
  Brain
} from 'lucide-react'
import { useBookingDrafts } from '../../hooks/useAPI'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Pipeline', href: '/pipeline', icon: TrendingUp },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Brain, highlight: true },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Staff', href: '/staff', icon: UserCog },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'AI Insights', href: '/ai-insights', icon: Sparkles },
]

export default function Sidebar() {
  const { data: drafts } = useBookingDrafts()
  const pendingCount = drafts?.filter(d => d.status === 'pending').length || 0

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <img src="/logo.webp" alt="Avatar Imaging" className="w-10 h-10 object-contain" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">Avatar Imaging</h1>
          <p className="text-xs text-gray-500">CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative',
                isActive
                  ? item.highlight
                    ? 'bg-gradient-to-r from-ai-100 to-primary-100 text-ai-700'
                    : 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                item.highlight && !isActive && 'hover:bg-gradient-to-r hover:from-ai-50 hover:to-primary-50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5', item.highlight && isActive && 'animate-pulse')} />
                {item.name}
                {item.name === 'AI Assistant' && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            )
          }
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>
      </div>
    </div>
  )
}
