import React from 'react'
import { describe, expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/page'

describe('PageHeader', () => {
  test('exposes the page title as a level-one heading', () => {
    const view = render(
      <PageHeader title="Token Claims Diff" description="Compare token claims." icon={KeyRound} />
    )

    expect(view.getByRole('heading', { level: 1, name: 'Token Claims Diff' })).toBeTruthy()
    expect(view.getByText('Compare token claims.')).toBeTruthy()
  })
})
