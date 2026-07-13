export const DEMO_CALLBACK_PATH = '/oauth-playground/callback'

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '[::1]' ||
    normalized === '::1'
  )
}

/**
 * Demo OAuth redirects are intentionally narrower than production OAuth client
 * registrations. By default, only this app's own callback is accepted. Exact
 * additional callbacks can be supplied by the Worker environment.
 */
export function isAllowedDemoRedirectUri(
  redirectUri: string,
  appUrl: string,
  configuredRedirectUris: readonly string[] = []
): boolean {
  let target: URL
  let app: URL

  try {
    target = new URL(redirectUri)
    app = new URL(appUrl)
  } catch {
    return false
  }

  if (!['http:', 'https:'].includes(target.protocol)) return false
  if (target.username || target.password || target.hash) return false

  if (configuredRedirectUris.some((configured) => configured.trim() === redirectUri)) {
    return true
  }

  if (target.pathname !== DEMO_CALLBACK_PATH || target.search) {
    return false
  }

  if (isLocalHostname(app.hostname)) {
    return isLocalHostname(target.hostname)
  }

  return target.origin === app.origin
}
