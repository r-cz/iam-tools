import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './components/navigation/nested-submenu.css'
import { ThemeProvider } from './components/theme'
import { AppStateProvider } from './lib/state'
import { Layout } from './components/layout'
import { Toaster } from './components/ui/sonner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const HomePage = lazy(() => import('./features/home'))
const TokenInspectorPage = lazy(() => import('./features/tokenInspector/pages'))
const OidcExplorerPage = lazy(() => import('./features/oidcExplorer/pages'))
const OAuthPlaygroundPage = lazy(() => import('./features/oauthPlayground/pages'))
const OAuthCallbackPage = lazy(() => import('./features/oauthPlayground/pages/callback'))
const DemoAuthPage = lazy(() => import('./features/oauthPlayground/pages/demo-auth'))
const AuthCodeWithPkcePage = lazy(() => import('./features/oauthPlayground/pages/auth-code-pkce'))
const ClientCredentialsPage = lazy(() => import('./features/oauthPlayground/pages/client-credentials'))
const IntrospectionPage = lazy(() => import('./features/oauthPlayground/pages/introspection'))
const UserInfoPage = lazy(() => import('./features/oauthPlayground/pages/userinfo'))
const SamlResponseDecoderPage = lazy(() => import('./features/saml/pages/response-decoder'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="iam-tools-theme">
      <AppStateProvider>
        <BrowserRouter>
          <Toaster position="bottom-right" closeButton richColors />
          <ErrorBoundary>
            <Suspense fallback={null}>
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
                  <Route path="saml/response-decoder" element={<SamlResponseDecoderPage />} />
                </Route>
                <Route path="oauth-playground/callback" element={<OAuthCallbackPage />} />
                <Route path="oauth-playground/demo-auth" element={<DemoAuthPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </AppStateProvider>
    </ThemeProvider>
  </StrictMode>,
)
