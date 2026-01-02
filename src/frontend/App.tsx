import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import FloatingAICommand from './components/ui/FloatingAICommand'

function App() {
  const handleAISubmit = async (message: string) => {
    console.log('AI Command:', message)
    // TODO: Integrate with AI endpoint
    // This will send the message to the backend API for processing
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<div className="p-8 text-center text-gray-500">Contacts Page (Coming Soon)</div>} />
          <Route path="/tasks" element={<div className="p-8 text-center text-gray-500">Tasks Page (Coming Soon)</div>} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/calendar" element={<div className="p-8 text-center text-gray-500">Calendar Page (Coming Soon)</div>} />
          <Route path="/messages" element={<div className="p-8 text-center text-gray-500">Messages Page (Coming Soon)</div>} />
          <Route path="/reports" element={<div className="p-8 text-center text-gray-500">Reports Page (Coming Soon)</div>} />
          <Route path="/ai-insights" element={<div className="p-8 text-center text-gray-500">AI Insights Page (Coming Soon)</div>} />
          <Route path="/settings" element={<div className="p-8 text-center text-gray-500">Settings Page (Coming Soon)</div>} />
        </Routes>
      </MainLayout>

      {/* Floating AI Command Palette */}
      <FloatingAICommand onSubmit={handleAISubmit} />
    </Router>
  )
}

export default App
