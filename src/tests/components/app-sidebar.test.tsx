import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppStateProvider, ToolPreferencesProvider } from '@/lib/state'

function renderSidebar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppStateProvider>
        <ToolPreferencesProvider>
          <SidebarProvider>
            <SidebarTrigger />
            <AppSidebar />
          </SidebarProvider>
        </ToolPreferencesProvider>
      </AppStateProvider>
    </MemoryRouter>
  )
}

describe('App sidebar', () => {
  const originalWidth = window.innerWidth
  beforeEach(() => {
    cleanup()
    window.innerWidth = 1200
  })
  afterEach(() => {
    cleanup()
    window.innerWidth = originalWidth
  })

  test('marks the exact current route and its workflow group', () => {
    renderSidebar('/oauth-playground/client-credentials')
    expect(
      screen.getByTestId('sidebar-nav-oauth-client-credentials').getAttribute('aria-current')
    ).toBe('page')
    expect(
      screen.getByTestId('sidebar-nav-oauth-client-credentials').getAttribute('data-active')
    ).toBe('true')
    expect(screen.getByTestId('sidebar-nav-oauth-playground').getAttribute('data-active')).toBe(
      'true'
    )
    expect(screen.getByTestId('sidebar-nav-home').getAttribute('aria-current')).toBeNull()
    fireEvent.click(screen.getByTestId('sidebar-nav-token-inspector'))
    expect(screen.getByTestId('sidebar-nav-token-inspector').getAttribute('aria-current')).toBe(
      'page'
    )
    expect(
      screen.getByTestId('sidebar-nav-oauth-client-credentials').getAttribute('aria-current')
    ).toBeNull()
  })

  test('closes mobile navigation after selecting even the current route', async () => {
    window.innerWidth = 390
    renderSidebar()
    const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Sidebar' })).not.toBeNull()
    fireEvent.click(screen.getByTestId('sidebar-nav-home'))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sidebar' })).toBeNull())
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('ignores repeated and composing sidebar shortcuts', () => {
    renderSidebar()
    const trigger = screen.getByRole('button', { name: 'Toggle Sidebar' })
    fireEvent.keyDown(window, { key: 'b', metaKey: true, repeat: true })
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, isComposing: true })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
})
