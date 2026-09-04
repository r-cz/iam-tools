import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initializeHandoffCleanup } from './lib/handoff'
import './index.css'
import './components/navigation/nested-submenu.css'

initializeHandoffCleanup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
