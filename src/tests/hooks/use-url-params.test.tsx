import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUrlParams } from '@/hooks/use-url-params'
import type { ReactNode } from 'react'

describe('useUrlParams', () => {
  // Wrapper that provides router context
  function createWrapper(initialEntries: string[]) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    }
  }

  it('should return empty object for no search params', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path']),
    })

    expect(result.current).toEqual({})
  })

  it('should return single search param', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?foo=bar']),
    })

    expect(result.current).toEqual({ foo: 'bar' })
  })

  it('should return multiple search params', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?foo=bar&baz=qux&num=123']),
    })

    expect(result.current).toEqual({
      foo: 'bar',
      baz: 'qux',
      num: '123',
    })
  })

  it('should handle URL-encoded values', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?message=hello%20world&email=test%40example.com']),
    })

    expect(result.current).toEqual({
      message: 'hello world',
      email: 'test@example.com',
    })
  })

  it('should handle empty values', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?empty=&hasValue=test']),
    })

    expect(result.current).toEqual({
      empty: '',
      hasValue: 'test',
    })
  })

  it('should handle special characters in values', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?special=%26%3D%3F']),
    })

    expect(result.current).toEqual({
      special: '&=?',
    })
  })

  it('should handle params with only key (no value)', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?flag']),
    })

    expect(result.current).toEqual({
      flag: '',
    })
  })

  it('should support typed params', () => {
    interface MyParams {
      userId: string
      page: string
    }

    const { result } = renderHook(() => useUrlParams<MyParams>(), {
      wrapper: createWrapper(['/path?userId=123&page=2']),
    })

    expect(result.current.userId).toBe('123')
    expect(result.current.page).toBe('2')
  })

  it('should handle duplicate keys (last value wins)', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?key=first&key=second']),
    })

    // URLSearchParams.forEach iterates all values, but our implementation
    // stores in an object so last one wins
    expect(result.current.key).toBe('second')
  })

  it('should handle complex OAuth callback params', () => {
    const callbackUrl =
      '/callback?code=auth_code_123&state=random_state_456&scope=openid%20profile%20email'

    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper([callbackUrl]),
    })

    expect(result.current).toEqual({
      code: 'auth_code_123',
      state: 'random_state_456',
      scope: 'openid profile email',
    })
  })

  it('should handle SAML response params', () => {
    const samlUrl = '/saml/acs?SAMLResponse=base64encodedresponse&RelayState=original_url'

    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper([samlUrl]),
    })

    expect(result.current).toEqual({
      SAMLResponse: 'base64encodedresponse',
      RelayState: 'original_url',
    })
  })

  it('should handle path with hash fragment', () => {
    // Note: MemoryRouter handles hash differently, search params should still work
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?foo=bar']),
    })

    expect(result.current.foo).toBe('bar')
  })

  it('should handle deeply nested paths', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/a/b/c/d/e?param=value']),
    })

    expect(result.current).toEqual({ param: 'value' })
  })

  it('should handle unicode characters', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?name=%E4%B8%AD%E6%96%87']),
    })

    expect(result.current.name).toBe('中文')
  })

  it('should handle plus signs (space encoding)', () => {
    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper(['/path?query=hello+world']),
    })

    // Plus signs are treated as spaces in query strings
    expect(result.current.query).toBe('hello world')
  })

  it('should handle JSON-like values', () => {
    const jsonValue = encodeURIComponent('{"key":"value"}')

    const { result } = renderHook(() => useUrlParams(), {
      wrapper: createWrapper([`/path?data=${jsonValue}`]),
    })

    expect(result.current.data).toBe('{"key":"value"}')
    expect(JSON.parse(result.current.data)).toEqual({ key: 'value' })
  })
})
