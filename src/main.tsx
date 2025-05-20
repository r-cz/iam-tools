import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './components/navigation/nested-submenu.css'
import { ThemeProvider } from './components/theme'
import { AppStateProvider } from './lib/state'
import { Layout } from './components/layout'
import { Toaster } from './components/ui/sonner'
import HomePage from './features/home'
import TokenInspectorPage from './features/tokenInspector/pages'
import OidcExplorerPage from './features/oidcExplorer/pages'
import OAuthPlaygroundPage from './features/oauthPlayground/pages'
import OAuthCallbackPage from './features/oauthPlayground/pages/callback'
import DemoAuthPage from './features/oauthPlayground/pages/demo-auth'
import AuthCodeWithPkcePage from './features/oauthPlayground/pages/auth-code-pkce'
import ClientCredentialsPage from './features/oauthPlayground/pages/client-credentials'
import IntrospectionPage from './features/oauthPlayground/pages/introspection'
import UserInfoPage from './features/oauthPlayground/pages/userinfo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="iam-tools-theme">
      <AppStateProvider>
        <BrowserRouter>
          <Toaster position="bottom-right" closeButton richColors />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="token-inspector" element={<TokenInspectorPage />} />
              <Route path="oidc-explorer" element={<OidcExplorerPage />} />
              <Route path="oauth-playground" element={<OAuthPlaygroundPage />} />
              <Route path="oauth-playground/auth-code-pkce" element={<AuthCodeWithPkcePage />} />
              <Route path="oauth-playground/client-credentials" element={<ClientCredentialsPage />} />
              <Route path="oauth-playground/introspection" element={<IntrospectionPage />} />
              <Route path="oauth-playground/userinfo" element={<UserInfoPage />} />
            </Route>
            <Route path="oauth-playground/callback" element={<OAuthCallbackPage />} />
            <Route path="oauth-playground/demo-auth" element={<DemoAuthPage />} />
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </ThemeProvider>
  </StrictMode>,
)