import { describe, expect, it } from 'bun:test'
import { addIssuerToHistory, addTokenToHistory } from '@/lib/state/utils'
import type { IssuerHistoryItem, TokenHistoryItem } from '@/lib/state/types'

describe('bounded history MRU transitions', () => {
  it('promotes an existing token and still enforces the current bound', () => {
    const history: TokenHistoryItem[] = [
      { id: 'a', token: 'a.b.c', createdAt: 1, lastUsedAt: 3 },
      { id: 'b', token: 'd.e.f', createdAt: 2, lastUsedAt: 2 },
      { id: 'c', token: 'g.h.i', createdAt: 3, lastUsedAt: 1 },
    ]
    const result = addTokenToHistory(history, 'g.h.i', 2)

    expect(result.map((item) => item.id)).toEqual(['c', 'a'])
    expect(result[0].createdAt).toBe(3)
  })

  it('promotes an existing issuer instead of leaving a stale ordering', () => {
    const history: IssuerHistoryItem[] = [
      { id: 'one', url: 'https://one.example', createdAt: 1, lastUsedAt: 2 },
      { id: 'two', url: 'https://two.example', createdAt: 2, lastUsedAt: 1 },
    ]

    expect(addIssuerToHistory(history, 'https://two.example', 10).map((item) => item.id)).toEqual([
      'two',
      'one',
    ])
  })
})
