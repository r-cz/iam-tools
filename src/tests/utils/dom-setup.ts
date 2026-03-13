/**
 * Sets up a simple DOM environment for Bun testing
 * This should be imported before using React Testing Library.
 */

import * as PropertySymbol from 'happy-dom/lib/PropertySymbol.js'
;(globalThis as any).__IAM_TOOLS_TEST__ = true

// Set up window.location (only if not provided by happy-dom)
;(globalThis as any).window = globalThis.window || {
  location: {
    hostname: 'localhost',
    protocol: 'http:',
    port: '3000',
    host: 'localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost:3000/',
  },
}

// Copy window properties to global
if (globalThis.window && !(globalThis as any).location) {
  Object.assign(globalThis, { location: (globalThis as any).window.location })
}

// happy-dom under Bun can miss window.SyntaxError, which breaks selector APIs.
if (globalThis.window && !(globalThis.window as any).SyntaxError) {
  ;(globalThis.window as any).SyntaxError = globalThis.SyntaxError
}

if (
  (globalThis.document as any)?.defaultView &&
  !(globalThis.document as any).defaultView.SyntaxError
) {
  ;(globalThis.document as any).defaultView.SyntaxError = globalThis.SyntaxError
}

for (const node of [
  globalThis.document,
  globalThis.document?.documentElement,
  globalThis.document?.body,
]) {
  const ownerWindow = (node as any)?.[PropertySymbol.window]
  if (ownerWindow && !ownerWindow.SyntaxError) {
    ownerWindow.SyntaxError = globalThis.SyntaxError
  }
}

const fallbackComputedStyle = () =>
  ({
    getPropertyValue: () => '',
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible',
    paddingLeft: '0px',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    marginLeft: '0px',
    marginTop: '0px',
    marginRight: '0px',
    marginBottom: '0px',
    borderLeftWidth: '0px',
    borderTopWidth: '0px',
    borderRightWidth: '0px',
    borderBottomWidth: '0px',
    width: '0px',
    height: '0px',
  }) as CSSStyleDeclaration

;(globalThis.window as any).getComputedStyle = fallbackComputedStyle
;(globalThis as any).getComputedStyle = fallbackComputedStyle

if (!(globalThis as any).requestAnimationFrame) {
  ;(globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0)
}

if (!(globalThis as any).cancelAnimationFrame) {
  ;(globalThis as any).cancelAnimationFrame = (handle: number) => clearTimeout(handle)
}

function matchesSimpleSelector(element: Element, selector: string) {
  const trimmedSelector = selector.trim()
  if (!trimmedSelector) {
    return false
  }

  if (trimmedSelector === '*') {
    return true
  }

  const selectorMatch = trimmedSelector.match(
    /^([a-zA-Z0-9_-]+)?(?:\[(.+?)(?:=["']?(.+?)["']?)?\])?$/
  )
  if (!selectorMatch) {
    return false
  }

  const [, tagName, attributeName, attributeValue] = selectorMatch

  if (tagName && element.tagName.toLowerCase() !== tagName.toLowerCase()) {
    return false
  }

  if (!attributeName) {
    return true
  }

  if (!element.hasAttribute(attributeName)) {
    return false
  }

  if (attributeValue === undefined) {
    return true
  }

  return element.getAttribute(attributeName) === attributeValue
}

function simpleQuerySelectorAll(root: Document | Element, selector: string): Element[] {
  const selectors = selector
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const candidates = Array.from(root.getElementsByTagName('*'))

  if (root instanceof Element) {
    candidates.unshift(root)
  }

  return candidates.filter((element) =>
    selectors.some((candidateSelector) => matchesSimpleSelector(element, candidateSelector))
  )
}

if (globalThis.document) {
  ;(globalThis.document as any).querySelectorAll = function querySelectorAll(selector: string) {
    return simpleQuerySelectorAll(this, selector)
  }
  ;(globalThis.document as any).querySelector = function querySelector(selector: string) {
    return simpleQuerySelectorAll(this, selector)[0] ?? null
  }
}

if ((globalThis as any).Document?.prototype) {
  ;((globalThis as any).Document.prototype as any).querySelectorAll = function querySelectorAll(
    selector: string
  ) {
    return simpleQuerySelectorAll(this, selector)
  }
  ;((globalThis as any).Document.prototype as any).querySelector = function querySelector(
    selector: string
  ) {
    return simpleQuerySelectorAll(this, selector)[0] ?? null
  }
}

if (globalThis.Element?.prototype) {
  ;(globalThis.Element.prototype as any).querySelectorAll = function querySelectorAll(
    selector: string
  ) {
    return simpleQuerySelectorAll(this, selector)
  }
  ;(globalThis.Element.prototype as any).querySelector = function querySelector(selector: string) {
    return simpleQuerySelectorAll(this, selector)[0] ?? null
  }
  ;(globalThis.Element.prototype as any).matches = function matches(selector: string) {
    return matchesSimpleSelector(this, selector)
  }
  ;(globalThis.Element.prototype as any).closest = function closest(selector: string) {
    let currentElement: Element | null = this
    while (currentElement) {
      if (matchesSimpleSelector(currentElement, selector)) {
        return currentElement
      }
      currentElement = currentElement.parentElement
    }

    return null
  }
}

if ((globalThis as any).HTMLElement?.prototype) {
  ;((globalThis as any).HTMLElement.prototype as any).matches = function matches(selector: string) {
    return matchesSimpleSelector(this, selector)
  }
  ;((globalThis as any).HTMLElement.prototype as any).closest = function closest(selector: string) {
    let currentElement: Element | null = this
    while (currentElement) {
      if (matchesSimpleSelector(currentElement, selector)) {
        return currentElement
      }
      currentElement = currentElement.parentElement
    }

    return null
  }
}

// Provide a localStorage polyfill only if not present (happy-dom supplies one)
if (!(globalThis as any).localStorage) {
  let store: Record<string, string> = {}
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as unknown as Storage
}

// Mock fetch if not available
if (!globalThis.fetch) {
  ;(globalThis as any).fetch = () => Promise.reject(new Error('fetch not implemented'))
}

// Provide DOMParser if not available (for SAML tests)
if (!(globalThis as any).DOMParser) {
  try {
    // Try to get DOMParser from happy-dom's window
    const win = (globalThis as any).window
    if (win && win.DOMParser) {
      ;(globalThis as any).DOMParser = win.DOMParser
    }
  } catch {
    // If that fails, provide a minimal mock
    ;(globalThis as any).DOMParser = class DOMParser {
      parseFromString(str: string, type: string) {
        // This is a minimal implementation - in real tests, happy-dom should provide this
        throw new Error('DOMParser not available - happy-dom may not be loaded correctly')
      }
    }
  }
}

// Export for tests to use
export const testEnvironment = {
  window: globalThis.window,
  cleanup: () => {
    // Clean up any global mocks here
  },
}
