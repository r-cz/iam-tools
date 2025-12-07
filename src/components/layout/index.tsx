import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { ThemeMeta } from '@/components/theme'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useLocation, Link } from 'react-router-dom'

// Route to human-readable title mapping
const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/token-inspector': 'Token Inspector',
  '/oidc-explorer': 'OIDC Explorer',
  '/oauth-playground': 'OAuth Playground',
  '/oauth-playground/auth-code-pkce': 'Auth Code with PKCE',
  '/oauth-playground/client-credentials': 'Client Credentials',
  '/oauth-playground/introspection': 'Introspection',
  '/oauth-playground/userinfo': 'UserInfo',
  '/saml/response-decoder': 'SAML Response Decoder',
  '/saml/request-builder': 'SAML Request Builder',
  '/saml/metadata-validator': 'SAML Metadata Validator',
  '/saml/sp-metadata': 'SP Metadata Generator',
  '/ldap/schema-explorer': 'LDAP Schema Explorer',
  '/ldap/ldif-builder': 'LDIF Builder',
}

export function Layout() {
  const location = useLocation()

  // Generate page title based on route with proper casing
  const getPageTitle = () => {
    const path = location.pathname
    // Check for exact match first
    if (routeTitles[path]) {
      return routeTitles[path]
    }
    // Fallback: generate title from path (for unknown routes)
    return (
      path
        .substring(1)
        .split('/')
        .pop()
        ?.split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Page'
    )
  }

  // Generate breadcrumb items based on route
  const getBreadcrumbItems = () => {
    const path = location.pathname
    if (path === '/') {
      return (
        <BreadcrumbItem>
          {/* Current page, not a link */}
          <BreadcrumbPage>Home</BreadcrumbPage>
        </BreadcrumbItem>
      )
    }

    return (
      <>
        <BreadcrumbItem className="hidden md:block">
          {/* Use asChild with Link for the "Home" breadcrumb */}
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          {/* Current page in breadcrumb */}
          <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    )
  }

  return (
    <SidebarProvider>
      <ThemeMeta />
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full justify-between">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>{getBreadcrumbItems()}</BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              {/* Theme toggle removed as it's now in the settings menu */}
            </div>
          </div>
        </header>
        {/* Main content area with id for skip link */}
        <main id="main-content">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
