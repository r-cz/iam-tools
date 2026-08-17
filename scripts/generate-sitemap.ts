import { allTools } from '../src/config/tool-catalog'

const SITE_ORIGIN = 'https://iam.tools'

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function createSitemap(paths: string[] = allTools.map(({ path }) => path)): string {
  const uniquePaths = ['/', ...new Set(paths)]
  const entries = uniquePaths
    .map((path) => `  <url><loc>${escapeXml(new URL(path, SITE_ORIGIN).toString())}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
}

if (import.meta.main) {
  await Bun.write(new URL('../dist/sitemap.xml', import.meta.url), createSitemap())
}
