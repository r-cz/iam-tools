/**
 * Simple Demo Server Utility
 * 
 * This utility provides endpoint URLs for the demo OAuth flow.
 * Rather than attempting to run a real server in the browser,
 * it simply redirects to our demo auth page which simulates
 * the OAuth flow for demonstration purposes.
 */

class DemoOAuthServer {
  private static instance: DemoOAuthServer;
  private baseUrl: string = '';
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    this.baseUrl = `${window.location.origin}/oauth-playground/demo-auth`;
  }
  
  /**
   * Get the singleton instance of the demo server
   */
  static getInstance(): DemoOAuthServer {
    if (!DemoOAuthServer.instance) {
      DemoOAuthServer.instance = new DemoOAuthServer();
    }
    return DemoOAuthServer.instance;
  }
  
  /**
   * Start the demo server - in this simplified implementation,
   * this just returns the demo auth page URL.
   * @returns The base URL of the demo auth page
   */
  async start(): Promise<string> {
    return this.baseUrl;
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
    return this.baseUrl;
  }
  
  /**
   * Get the authorization endpoint URL
   */
  getAuthorizationEndpoint(): string {
    return this.baseUrl;
  }
  
  /**
   * Get the token endpoint URL 
   * In demo mode, we'll handle token issuance in the front-end
   */
  getTokenEndpoint(): string {
    return `${window.location.origin}/oauth-playground/token`;
  }
  
  /**
   * Get the JWKS endpoint URL
   */
  getJwksEndpoint(): string {
    return `${window.location.origin}/oauth-playground/jwks`;
  }
  
  /**
   * Get the userinfo endpoint URL
   */
  getUserInfoEndpoint(): string {
    return `${window.location.origin}/oauth-playground/userinfo`;
  }
  
  /**
   * Get the discovery endpoint URL
   */
  getDiscoveryEndpoint(): string {
    return `${window.location.origin}/oauth-playground/.well-known/openid-configuration`;
  }
}

export default DemoOAuthServer;
