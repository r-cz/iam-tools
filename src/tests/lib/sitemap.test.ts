import { describe, expect, test } from 'bun:test'
import { allTools } from '@/config/tool-catalog'
import { createSitemap } from '../../../scripts/generate-sitemap'

describe('generated sitemap', () => {
  test('derives every public tool route from the catalog without stale timestamps', () => {
    const sitemap = createSitemap()

    expect(sitemap).toContain('<loc>https://iam.tools/</loc>')
    for (const tool of allTools) {
      expect(sitemap).toContain(`<loc>https://iam.tools${tool.path}</loc>`)
    }
    expect(sitemap).not.toContain('<lastmod>')
  })
})
