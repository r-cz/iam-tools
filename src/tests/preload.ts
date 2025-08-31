// This preload file configures the environment for all Bun tests

// Provide a DOM implementation for tests via happy-dom
// Try multiple import paths for compatibility across versions
// If all fail, fall back to a minimal Window shim from happy-dom
async function setupDom() {
  try {
    await import('happy-dom/global')
    return
  } catch {}
  try {
    await import('happy-dom/global.js')
    return
  } catch {}
  try {
    const mod: any = await import('happy-dom')
    const Win = mod.Window || (mod.default && mod.default.Window)
    if (Win) {
      const win = new Win()
      ;(globalThis as any).window = win
      ;(globalThis as any).document = win.document
      ;(globalThis as any).navigator = win.navigator
      ;(globalThis as any).location = win.location
      return
    }
  } catch {}
  console.warn('happy-dom not available; tests may not have full DOM APIs')
}

await setupDom()

// Import from bun:test
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

// Import DOM setup (this will configure the DOM environment)
import './utils/dom-setup'

// Set up before all tests
beforeAll(() => {
  console.log('⚙️ Test environment initialized')
})

// Clean up after all tests
afterAll(() => {
  console.log('✅ All tests completed')
})

// Export the preloaded objects to make them available in tests
export { beforeAll, afterAll, beforeEach, afterEach, describe, test, expect }
