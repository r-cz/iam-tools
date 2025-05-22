export const selectors = {
  // Navigation
  nav: {
    home: 'a[href="/"]',
    tokenInspector: 'a[href="/token-inspector"]',
    oidcExplorer: 'a[href="/oidc-explorer"]',
    oauthPlayground: 'button:has-text("OAuth Playground")',
    authCodePkce: 'a[href="/oauth-playground/auth-code-pkce"]',
    clientCredentials: 'a[href="/oauth-playground/client-credentials"]',
    introspection: 'a[href="/oauth-playground/introspection"]',
    userinfo: 'a[href="/oauth-playground/userinfo"]',
  },

  // Common buttons
  buttons: {
    primary: '.bg-primary',
    secondary: '.bg-secondary',
    paste: 'button:has-text("Paste")',
    example: 'button:has-text("Example")',
    reset: 'button:has-text("Reset")',
    fetchConfig: 'button:has-text("Fetch Config")',
    inspectToken: 'button:has-text("Inspect Token")',
  },

  // Token Inspector
  tokenInspector: {
    tokenInput: 'textarea[placeholder*="OAuth/OIDC Token"]',
    tokenDisplay: '.token-display',
    headerTab: 'button[role="tab"]:has-text("Header")',
    payloadTab: 'button[role="tab"]:has-text("Payload")',
    signatureTab: 'button[role="tab"]:has-text("Signature")',
    timelineTab: 'button[role="tab"]:has-text("Timeline")',
    signatureValid: 'text=Signature Valid',
    tokenSize: 'button:has-text("Token Size")',
  },

  // OIDC Explorer
  oidcExplorer: {
    urlInput: 'input[placeholder*="OpenID Provider URL"]',
    randomExample: 'button[aria-label="Load random example"]',
    configDisplay: '.config-display',
    jwksDisplay: '.jwks-display',
  },

  // OAuth Playground
  oauthPlayground: {
    demoModeSwitch: '[role="switch"]',
    authUrlInput: 'input[placeholder*="example.com/authorize"]',
    tokenUrlInput: 'input[placeholder*="example.com/token"]',
    clientIdInput: 'input[placeholder="Your client ID"]',
    clientSecretInput: 'input[placeholder="Your client secret"]',
    scopeInput: 'input[placeholder*="openid"]',
    startAuthButton: 'button:has-text("Continue to Authorization")',
    exchangeTokenButton: 'button:has-text("Exchange Token")',
  },

  // Notifications
  toast: {
    success: '[role="status"]:has-text("success")',
    error: '[role="status"]:has-text("error")',
    close: 'button[aria-label="Close toast"]',
  },
};