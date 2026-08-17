import * as React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { CommandCenterProvider, CommandCenterTrigger } from '@/components/command-center'
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
import { routeTitles, toolByPath } from '@/config/tool-catalog'
import { ToolPreferencesProvider, useToolPreferences } from '@/lib/state'

function LayoutContent() {
  const location = useLocation()
  const { recordRecent } = useToolPreferences()
  const lastTrackedPath = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (lastTrackedPath.current === location.pathname) return
    lastTrackedPath.current = location.pathname

    const activeTool = toolByPath.get(location.pathname)
    if (activeTool) recordRecent(activeTool.id)
  }, [location.pathname, recordRecent])

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
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList>{getBreadcrumbItems()}</BreadcrumbList>
            </Breadcrumb>
            <CommandCenterTrigger className="ml-auto w-10 justify-center px-0 sm:w-64 sm:justify-start sm:px-3" />
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

export function Layout() {
  return (
    <ToolPreferencesProvider>
      <CommandCenterProvider>
        <LayoutContent />
      </CommandCenterProvider>
    </ToolPreferencesProvider>
  )
}
