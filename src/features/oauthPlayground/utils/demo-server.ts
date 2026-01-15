/**
 * Simple Demo Server Utility
 *
 * This utility provides endpoint URLs for the demo OAuth flow.
 * It maps to the local demo OAuth endpoints served by the worker.
 */

import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'

class DemoOAuthServer {
  private static instance: DemoOAuthServer
  private baseUrl: string = ''

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    this.baseUrl = getIssuerBaseUrl()
  }

  /**
   * Get the singleton instance of the demo server
   */
  static getInstance(): DemoOAuthServer {
    if (!DemoOAuthServer.instance) {
      DemoOAuthServer.instance = new DemoOAuthServer()
    }
    return DemoOAuthServer.instance
  }

  /**
   * Start the demo server - in this simplified implementation,
   * this just returns the demo auth page URL.
   * @returns The base URL of the demo auth page
   */
  async start(): Promise<string> {
    return this.baseUrl
  }

  /**
   * Stop the demo server - no-op in this implementation
   */
  async stop(): Promise<void> {
    // Nothing to do
  }

  /**
   * Get the base URL of the server
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Get the authorization endpoint URL
   */
  getAuthorizationEndpoint(): string {
    return `${this.baseUrl}/auth`
  }

  /**
   * Get the token endpoint URL
   */
  getTokenEndpoint(): string {
    return `${this.baseUrl}/token`
  }

  /**
   * Get the JWKS endpoint URL
   */
  getJwksEndpoint(): string {
    return `${this.baseUrl}/jwks`
  }

  /**
   * Get the userinfo endpoint URL
   */
  getUserInfoEndpoint(): string {
    return `${this.baseUrl}/userinfo`
  }

  /**
   * Get the discovery endpoint URL
   */
  getDiscoveryEndpoint(): string {
    return `${this.baseUrl}/.well-known/openid-configuration`
  }
}

export default DemoOAuthServer
