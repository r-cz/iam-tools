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
})
