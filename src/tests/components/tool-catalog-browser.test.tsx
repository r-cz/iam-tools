import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { ToolCatalogBrowser } from '@/features/home/tool-catalog-browser'
import { ToolPreferencesProvider } from '@/lib/state/tool-preferences-context'
import { STORAGE_KEYS } from '@/lib/state/constants'

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

function renderCatalog() {
  return render(
    <MemoryRouter>
      <ToolPreferencesProvider>
        <ToolCatalogBrowser />
        <LocationProbe />
      </ToolPreferencesProvider>
    </MemoryRouter>
  )
}

describe('Tool catalog browser', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  test('combines protocol and text filters and recovers from empty results', () => {
    renderCatalog()
    const input = screen.getByRole('searchbox', { name: 'Filter tool catalog' })
    const protocolFilters = screen.getByRole('group', { name: 'Filter by protocol' })
    fireEvent.click(within(protocolFilters).getByRole('button', { name: 'LDAP', exact: true }))
    expect(screen.getByRole('status').textContent).toBe('3 tools found')
    expect(screen.queryByTestId('home-card-token-inspector')).toBeNull()

    fireEvent.change(input, { target: { value: 'RFC 4515' } })
    expect(screen.getByRole('status').textContent).toBe('1 tool found')
    expect(screen.getByRole('link', { name: /LDAP Filter Studio/ })).not.toBeNull()

    fireEvent.change(input, { target: { value: 'jwt' } })
    expect(screen.getByRole('heading', { name: 'No matching tools' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Browse all tools' }))
    expect(screen.getByTestId('home-card-token-inspector')).not.toBeNull()
    expect(screen.getByTestId('home-card-ldap-filter-studio')).not.toBeNull()
    expect(document.activeElement).toBe(input)
  })

  test('search exposes workflow routes that are hidden from the default catalog', () => {
    renderCatalog()
    expect(screen.queryByRole('link', { name: /Authorization Code with PKCE/ })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'auth code' } })
    fireEvent.click(screen.getByRole('link', { name: /Authorization Code with PKCE/ }))
    expect(screen.getByTestId('location').textContent).toBe('/oauth-playground/auth-code-pkce')
  })

  test('stars a tool without navigating and includes saved workflow favorites', () => {
    localStorage.setItem(
      STORAGE_KEYS.FAVORITE_TOOL_IDS,
      JSON.stringify(['oauth-client-credentials'])
    )
    renderCatalog()
    fireEvent.click(screen.getByRole('button', { name: 'Add Token Inspector to favorites' }))
    expect(screen.getByTestId('location').textContent).toBe('/')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITE_TOOL_IDS) ?? '[]')).toEqual([
      'oauth-client-credentials',
      'token-inspector',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Favorites', exact: true }))
    expect(screen.getByRole('status').textContent).toBe('2 tools found')
    expect(screen.getByRole('link', { name: /Client Credentials/ })).not.toBeNull()
    expect(screen.getByTestId('home-card-token-inspector')).not.toBeNull()
    expect(screen.queryByTestId('home-card-oidc-explorer')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Token Inspector from favorites' }))
    expect(screen.queryByTestId('home-card-token-inspector')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('1 tool found')
  })
})
