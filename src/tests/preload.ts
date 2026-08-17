import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow({ url: 'http://localhost:3000/' })

const browserGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'DOMParser',
  'XMLSerializer',
  'Node',
  'Element',
  'HTMLElement',
  'HTMLFormElement',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'ResizeObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const

Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
for (const name of browserGlobals.slice(1)) {
  const value = window[name as keyof typeof window]
  if (value === undefined) throw new Error(`happy-dom is missing required browser global: ${name}`)
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: typeof value === 'function' ? value.bind(window) : value,
  })
}

;(globalThis as { __IAM_TOOLS_TEST__?: boolean }).__IAM_TOOLS_TEST__ = true

if (!globalThis.document || !globalThis.DOMParser || !globalThis.HTMLElement) {
  throw new Error('happy-dom bootstrap did not provide the required DOM contract')
}

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
  sessionStorage.clear()
})

beforeAll(() => console.log('⚙️ Test environment initialized'))
afterAll(() => console.log('✅ All tests completed'))

export { beforeAll, afterAll, beforeEach, afterEach, describe, test, expect }
