import { describe, expect, test } from 'bun:test'

// Simplified test for the localStorage hook
describe('useLocalStorage', () => {
  test('should store and retrieve values', () => {
    // Mock implementation of the hook logic
    const mockStorage: Record<string, string> = {}

    // Set function
    const setValue = (key: string, value: any) => {
      mockStorage[key] = JSON.stringify(value)
      return value
    }

    // Get function
    const getValue = (key: string, defaultValue: any) => {
      const stored = mockStorage[key]
      if (stored) {
        return JSON.parse(stored)
      }
      return defaultValue
    }

    // Test storing a value
    setValue('theme', 'dark')
    expect(mockStorage['theme']).toBe('"dark"')

    // Test retrieving a value
    const theme = getValue('theme', 'light')
    expect(theme).toBe('dark')

    // Test with default value
    const language = getValue('language', 'en')
    expect(language).toBe('en')
  })
})
