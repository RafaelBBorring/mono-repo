import React, { Suspense, lazy } from 'react'
import MysticBackdrop from './components/backdrop/MysticBackdrop.jsx'
import AppShell from './components/layout/AppShell.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { useHashRoute } from './hooks/useHashRoute.js'

const HomeView = lazy(() => import('./components/home/HomeView.jsx'))
const LibraryView = lazy(() => import('./components/library/LibraryView.jsx'))
const WizardView = lazy(() => import('./components/wizard/WizardView.jsx'))
const SheetView = lazy(() => import('./components/sheet/SheetView.jsx'))
const BoardsView = lazy(() => import('./components/canvas/BoardsView.jsx'))
const BoardView = lazy(() => import('./components/canvas/BoardView.jsx'))

function Fallback() {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="spinner-border text-gold" role="status" />
        <div className="text-muted-drako mt-3" style={{ fontFamily: 'Cinzel' }}>Forjando...</div>
      </div>
    </div>
  )
}

export default function App() {
  const { route } = useHashRoute()
  const [root, param] = route.path

  let view
  switch (root) {
    case undefined: view = <HomeView />; break
    case 'biblioteca': view = <LibraryView />; break
    case 'novo': view = <WizardView />; break
    case 'ficha': view = <SheetView id={param} />; break
    case 'quadros': view = <BoardsView />; break
    case 'quadro': view = <BoardView id={param} />; break
    default: view = <HomeView />
  }

  return (
    <ToastProvider>
      <MysticBackdrop />
      <AppShell>
        <Suspense fallback={<Fallback />}>
          <div key={(route.path[0] || 'home') + (route.path[1] || '')} className="page-enter">
            {view}
          </div>
        </Suspense>
      </AppShell>
    </ToastProvider>
  )
}
