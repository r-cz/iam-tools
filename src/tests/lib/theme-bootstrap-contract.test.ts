import { describe, expect, test } from 'bun:test'

describe('theme bootstrap delivery contract', () => {
  test('uses an existing blocking same-origin script without executable inline JavaScript', async () => {
    const html = await Bun.file('index.html').text()
    const bootstrap = await Bun.file('public/theme-bootstrap.js').text()

    expect(html).toContain('<script src="/theme-bootstrap.js"></script>')
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i)
    expect(bootstrap).toContain("window.localStorage.getItem('iam-tools-theme')")
    expect(bootstrap).not.toContain('addEventListener')
  })
})
