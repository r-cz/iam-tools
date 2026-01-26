'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronsUpDown,
  Github,
  Mail,
  ExternalLink,
  Settings,
  Sun,
  Moon,
  Monitor,
  Trash,
  Save,
  Activity,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTheme } from '@/components/theme'
import { useSettings, useTokenHistory, useIssuerHistory } from '@/lib/state'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import { jwksCache } from '@/lib/cache/jwks-cache'
import { getDiagnosticsSnapshot, subscribeDiagnostics } from '@/lib/diagnostics/client-diagnostics'
import { toast } from 'sonner'

export function NavSettings() {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings, resetSettings } = useSettings()
  const { clearTokens } = useTokenHistory()
  const { clearIssuers } = useIssuerHistory()
  const appVersion = import.meta.env.APP_VERSION
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false)
  const [perfMetrics, setPerfMetrics] = useState<{
    ttfb?: number
    domContentLoaded?: number
    load?: number
    fcp?: number
    lcp?: number
    cls?: number
  } | null>(null)
  const [diagnostics, setDiagnostics] = useState(() => getDiagnosticsSnapshot())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateStatus = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    }

    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    setServiceWorkerSupported('serviceWorker' in navigator)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return

    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    const paintEntries = performance.getEntriesByType('paint') as PerformanceEntry[]
    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint')

    setPerfMetrics((current) => ({
      ...(current ?? {}),
      ttfb: navEntry?.responseStart,
      domContentLoaded: navEntry?.domContentLoadedEventEnd,
      load: navEntry?.loadEventEnd,
      fcp: fcpEntry?.startTime,
    }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    let clsValue = 0
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (!lastEntry) return
      setPerfMetrics((current) => ({
        ...(current ?? {}),
        lcp: lastEntry.startTime,
      }))
    })

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        if (!shift.value || shift.hadRecentInput) continue
        clsValue += shift.value
      }
      setPerfMetrics((current) => ({
        ...(current ?? {}),
        cls: clsValue,
      }))
    })

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      lcpObserver.disconnect()
    }

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch {
      clsObserver.disconnect()
    }

    return () => {
      lcpObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  useEffect(() => subscribeDiagnostics(setDiagnostics), [])

  const formatMs = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)} ms` : '—'
  const formatScore = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—'

  const performanceSummary = useMemo(
    () => ({
      ttfb: formatMs(perfMetrics?.ttfb),
      domContentLoaded: formatMs(perfMetrics?.domContentLoaded),
      load: formatMs(perfMetrics?.load),
      fcp: formatMs(perfMetrics?.fcp),
      lcp: formatMs(perfMetrics?.lcp),
      cls: formatScore(perfMetrics?.cls),
    }),
    [perfMetrics]
  )

  const handleClearAllHistory = () => {
    clearTokens()
    clearIssuers()
    oidcConfigCache.clear()
    jwksCache.clear()
    toast.success('All data cleared', {
      description: 'Token history, issuer history, and cache have been cleared.',
    })
  }

  const handleMaxHistoryChange = (value: string) => {
    const maxItems = parseInt(value, 10)
    updateSettings({ maxHistoryItems: maxItems })
    toast.success('Settings updated', {
      description: `Maximum history items set to ${maxItems}.`,
    })
  }

  const handleResetSettings = () => {
    resetSettings()
    toast.success('Settings reset', {
      description: 'All settings have been reset to default values.',
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Settings className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Settings</span>
                <span className="truncate text-xs">& Help</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Theme Settings */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                {theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                >
                  <DropdownMenuRadioItem value="light" className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Storage Settings */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <span>History Size</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={settings.maxHistoryItems.toString()}
                  onValueChange={handleMaxHistoryChange}
                >
                  <DropdownMenuRadioItem value="5">5 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="10">10 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="20">20 items</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="50">50 items</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Clear Data */}
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={handleClearAllHistory}
            >
              <Trash className="h-4 w-4" />
              <span>Clear All Data</span>
            </DropdownMenuItem>

            {/* Reset Settings */}
            <DropdownMenuItem className="flex items-center gap-2" onClick={handleResetSettings}>
              <Settings className="h-4 w-4" />
              <span>Reset Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Diagnostics</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Connection</span>
                  <DropdownMenuShortcut>{isOnline ? 'Online' : 'Offline'}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Service Worker</span>
                  <DropdownMenuShortcut>
                    {serviceWorkerSupported ? 'Supported' : 'Unavailable'}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>FCP</span>
                  <DropdownMenuShortcut>{performanceSummary.fcp}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>LCP</span>
                  <DropdownMenuShortcut>{performanceSummary.lcp}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>CLS</span>
                  <DropdownMenuShortcut>{performanceSummary.cls}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>TTFB</span>
                  <DropdownMenuShortcut>{performanceSummary.ttfb}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>DOM Ready</span>
                  <DropdownMenuShortcut>{performanceSummary.domContentLoaded}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Load</span>
                  <DropdownMenuShortcut>{performanceSummary.load}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Error Boundary</span>
                  <DropdownMenuShortcut>{diagnostics.errorBoundaryCount}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Window Errors</span>
                  <DropdownMenuShortcut>{diagnostics.windowErrorCount}</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
                  <span>Unhandled Rejections</span>
                  <DropdownMenuShortcut>{diagnostics.unhandledRejectionCount}</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Help</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/r-cz/iam-tools/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub Issues</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="mailto:mail@ryancruz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="cursor-default data-[disabled]:opacity-100">
              <span>Version</span>
              <DropdownMenuShortcut>{appVersion}</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
