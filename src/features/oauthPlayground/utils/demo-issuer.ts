export function getIssuerBaseUrl(): string {
  const { hostname, protocol, host } = window.location
  if (
    import.meta.env.DEV !== false &&
    (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
  ) {
    return 'http://localhost:8788/api'
  }
  return `${protocol}//${host}/api`
}
