import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Contacts from './pages/Contacts'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Messages from './pages/Messages'
import BookingDrafts from './pages/BookingDrafts'
import Templates from './pages/Templates'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import PipelineSettings from './pages/PipelineSettings'
import TagManagement from './pages/TagManagement'
import UserPreferences from './pages/UserPreferences'
import PublicBooking from './pages/PublicBooking'
import FloatingAICommand from './components/ui/FloatingAICommand'
import { useAIQuery } from './hooks/useAPI'
import { PreferencesProvider } from './contexts/PreferencesContext'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
})

function AppContent() {
  const aiQueryMutation = useAIQuery()

  const handleAISubmit = async (message: string) => {
    try {
      const result = await aiQueryMutation.mutateAsync({
        message,
        context: {},
      })
      console.log('AI Response:', result)
      return result
    } catch (error) {
      console.error('AI Query failed:', error)
      throw error
    }
  }

  return (
    <>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/ai-assistant" element={<BookingDrafts />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/pipelines" element={<PipelineSettings />} />
          <Route path="/settings/tags" element={<TagManagement />} />
          <Route path="/settings/preferences" element={<UserPreferences />} />
        </Routes>
      </MainLayout>

      {/* Floating AI Command Palette */}
      <FloatingAICommand onSubmit={handleAISubmit} />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <Router>
          <Routes>
            {/* Public booking page - no layout */}
            <Route path="/book" element={<PublicBooking />} />
            <Route path="/public/book" element={<PublicBooking />} />

            {/* All other routes with layout */}
            <Route path="*" element={<AppContent />} />
          </Routes>
        </Router>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}

export default App
