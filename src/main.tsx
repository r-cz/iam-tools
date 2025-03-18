import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './components/theme-provider'
import { Layout } from './components/layout'
import HomePage from './pages/home'
import TokenInspectorPage from './pages/token-inspector'
import MermaidEditorPage from './pages/mermaid-editor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="iam-tools-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="token-inspector" element={<TokenInspectorPage />} />
            <Route path="mermaid-editor" element={<MermaidEditorPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
