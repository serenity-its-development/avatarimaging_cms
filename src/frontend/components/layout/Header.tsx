import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, CheckCircle, AlertCircle, Info, Settings, LogOut, User, Users, ChevronDown } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { useStaff } from '../../hooks/useAPI'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info'
  title: string
  message: string
  time: string
  read: boolean
}

export default function Header() {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showStaffSelector, setShowStaffSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentStaffId, setCurrentStaffId] = useState<string>('system')
  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const staffSelectorRef = useRef<HTMLDivElement>(null)

  const { data: staffList } = useStaff()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery)
      navigate(`/contacts?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Mock notifications
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Urgent Follow-up',
      message: 'Contact "Sarah Johnson" needs follow-up within 2 hours',
      time: '5 min ago',
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'Booking Confirmed',
      message: 'New booking scheduled for tomorrow at 10:00 AM',
      time: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: 'System Update',
      message: 'Warmness scores recalculated for all contacts',
      time: '3 hours ago',
      read: true,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  // Handler for clicking a notification
  const handleNotificationClick = (notification: Notification) => {
    // TODO: Navigate to the relevant page based on notification type
    // For now, just mark as read
    console.log('Notification clicked:', notification)
    setShowNotifications(false)
  }

  // Handler for viewing all notifications
  const handleViewAllNotifications = () => {
    // TODO: Navigate to notifications page
    navigate('/notifications')
    setShowNotifications(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (staffSelectorRef.current && !staffSelectorRef.current.contains(event.target as Node)) {
        setShowStaffSelector(false)
      }
    }

    if (showNotifications || showUserMenu || showStaffSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications, showUserMenu, showStaffSelector])

  const currentStaff = staffList?.find(s => s.id === currentStaffId)
  const staffName = currentStaff ? `${currentStaff.first_name} ${currentStaff.last_name}` : 'System'

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning-600" />
      default:
        return <Info className="w-5 h-5 text-primary-600" />
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <div className="flex-1 max-w-2xl">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts, tasks... (Cmd+K for AI)"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 ml-6">
          {/* Staff Selector - Temporary for Testing */}
          <div className="relative" ref={staffSelectorRef}>
            <button
              onClick={() => setShowStaffSelector(!showStaffSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">{staffName}</span>
              <ChevronDown className="w-4 h-4 text-blue-600" />
            </button>

            {/* Staff Selector Dropdown */}
            {showStaffSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Testing As</p>
                  <p className="text-xs text-gray-400 mt-1">Select staff member to test as</p>
                </div>

                <button
                  onClick={() => {
                    setCurrentStaffId('system')
                    setShowStaffSelector(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 ${
                    currentStaffId === 'system' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <Avatar size="sm" fallback="SYS" />
                  <div>
                    <p className="font-medium">System</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                {staffList?.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setCurrentStaffId(staff.id)
                      setShowStaffSelector(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 ${
                      currentStaffId === staff.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Avatar
                      size="sm"
                      fallback={`${staff.first_name[0]}${staff.last_name[0]}`}
                    />
                    <div>
                      <p className="font-medium">{staff.first_name} {staff.last_name}</p>
                      <p className="text-xs text-gray-500">{staff.email}</p>
                    </div>
                  </button>
                ))}

                {(!staffList || staffList.length === 0) && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No staff members found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge variant="primary" size="sm">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0 ${
                          !notification.read ? 'bg-primary-50/30' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-gray-900">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-gray-200">
                  <button
                    onClick={handleViewAllNotifications}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium w-full text-center"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Avatar size="sm" fallback="Admin" status="online" />
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">admin@avatarimaging.com.au</p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <div className="border-t border-gray-200 my-1"></div>

                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    // TODO: Implement logout
                    console.log('Logout clicked')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
