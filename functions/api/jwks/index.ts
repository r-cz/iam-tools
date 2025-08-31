import type { PagesFunction } from '@cloudflare/workers-types'
import { DEMO_JWKS } from '../../../src/lib/jwt/demo-key'

/**
 * JWKS endpoint for demo key(s).
 * Serves the public keys used by the demo token generator.
 */
export const onRequest: PagesFunction = async () => {
  return new Response(JSON.stringify(DEMO_JWKS, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
