import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Contacts from './pages/Contacts'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Messages from './pages/Messages'
import Reports from './pages/Reports'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import FloatingAICommand from './components/ui/FloatingAICommand'
import { useAIQuery } from './hooks/useAPI'

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
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/settings" element={<Settings />} />
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
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}

export default App
