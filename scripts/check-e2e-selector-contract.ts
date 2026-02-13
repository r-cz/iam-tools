import path from 'node:path'

const repoRoot = path.resolve(import.meta.dir, '..')
const selectorsPath = path.join(repoRoot, 'e2e/helpers/selectors.ts')

const selectorsContent = await Bun.file(selectorsPath).text()
const selectorTestIds = new Set(
  Array.from(selectorsContent.matchAll(/data-testid="([^"]+)"/g), (match) => match[1])
)

if (selectorTestIds.size === 0) {
  console.error('No data-testid selectors were found in e2e/helpers/selectors.ts')
  process.exit(1)
}

const sourceGlob = new Bun.Glob('src/**/*.{ts,tsx,js,jsx}')
const sourceFiles = [] as string[]
for await (const relativePath of sourceGlob.scan({ cwd: repoRoot })) {
  sourceFiles.push(path.join(repoRoot, relativePath))
}
const sourceContents = await Promise.all(
  sourceFiles.map((sourceFile) => Bun.file(sourceFile).text())
)

const missing = [] as string[]
for (const testId of selectorTestIds) {
  let found = false
  for (const content of sourceContents) {
    if (content.includes(testId)) {
      found = true
      break
    }
  }

  if (!found) {
    missing.push(testId)
  }
}

if (missing.length > 0) {
  console.error('E2E selector contract failed. Missing data-testid values in src/:')
  for (const testId of missing.sort()) {
    console.error(`- ${testId}`)
  }
  process.exit(1)
}

console.log(
  `E2E selector contract passed (${selectorTestIds.size} selectors matched testid strings in src/)`
)
