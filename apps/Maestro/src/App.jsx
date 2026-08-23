import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useAuth } from './contexts/AuthContext'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { OverviewPage } from './pages/OverviewPage'
import { SourcesPage } from './pages/SourcesPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { TimelinePage } from './pages/TimelinePage'
import { ReviewPage } from './pages/ReviewPage'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { MiroCapturePage } from './pages/MiroCapturePage'
import { AtlasPage } from './pages/AtlasPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { PipelinePage } from './pages/PipelinePage'
import { DiscardsPage } from './pages/PipelinePage'
import { YggdrasilPage } from './pages/YggdrasilPage'
import { CanonPage } from './pages/CanonPage'
import { EventsPage } from './pages/EventsPage'
import { ChatFullscreenPage } from './pages/ChatFullscreenPage'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loader"><span /><p>Preparando sua memória...</p></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <AppShell />
}

function ProtectedFullscreen() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="app-loader"><span /><p>Preparando sua memória...</p></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <ChatFullscreenPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/chat" element={<ProtectedFullscreen />} />
      <Route path="/app" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="chat" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="yggdrasil" element={<YggdrasilPage />} />
        <Route path="canon" element={<CanonPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="discards" element={<DiscardsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="atlas" element={<AtlasPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="miro-capture" element={<MiroCapturePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
