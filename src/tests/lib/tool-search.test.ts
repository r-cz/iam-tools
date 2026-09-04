import { describe, expect, test } from 'bun:test'

import { allTools } from '@/config/tool-catalog'
import { searchToolCommands, toolCommands } from '@/lib/tool-search'

describe('tool command search', () => {
  test('derives every command from the shared tool catalog', () => {
    expect(toolCommands.map(({ tool }) => tool.id)).toEqual(allTools.map(({ id }) => id))
  })

  test('searches descriptions, tags, and section names', () => {
    expect(searchToolCommands('machine-to-machine').map(({ tool }) => tool.id)).toContain(
      'oauth-client-credentials'
    )
    expect(searchToolCommands('RFC 4515').map(({ tool }) => tool.id)).toEqual([
      'ldap-filter-studio',
    ])

    const provisioningResults = searchToolCommands('Provisioning').map(({ tool }) => tool.id)
    expect(provisioningResults).toContain('scim-resource-validator')
    expect(provisioningResults).toContain('scim-patch-builder')
  })

  test('matches navigation labels, route paths, and punctuation-separated protocol names', () => {
    expect(searchToolCommands('auth code').map(({ tool }) => tool.id)).toContain('oauth-auth-code')
    expect(searchToolCommands('/oauth-playground/client-credentials')[0]?.tool.id).toBe(
      'oauth-client-credentials'
    )
    expect(searchToolCommands('SCIM 2.0').map(({ tool }) => tool.id)).toEqual([
      'scim-patch-builder',
      'scim-resource-validator',
    ])
    expect(searchToolCommands('client_credentials').map(({ tool }) => tool.id)).toContain(
      'oauth-client-credentials'
    )
    expect(searchToolCommands('oauth oidc').map(({ tool }) => tool.id)).toContain('oidc-explorer')
  })

  test('matches core tools independently of the browser casing locale', () => {
    const originalToLocaleLowerCase = String.prototype.toLocaleLowerCase

    Object.defineProperty(String.prototype, 'toLocaleLowerCase', {
      configurable: true,
      writable: true,
      value: function toTurkishLowerCase(this: string) {
        return originalToLocaleLowerCase.call(this, 'tr')
      },
    })

    try {
      expect(searchToolCommands('inspector').map(({ tool }) => tool.id)).toContain(
        'token-inspector'
      )
      expect(searchToolCommands('oidc').map(({ tool }) => tool.id)).toContain('oidc-explorer')
    } finally {
      Object.defineProperty(String.prototype, 'toLocaleLowerCase', {
        configurable: true,
        writable: true,
        value: originalToLocaleLowerCase,
      })
    }
  })
})
