import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { MaestroProvider } from './contexts/MaestroContext'
import './styles/index.css'
import './styles/pages.css'
import './styles/features.css'
import './styles/atlas.css'
import './styles/tokens.css'
import './styles/extras.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <MaestroProvider>
          <App />
        </MaestroProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
