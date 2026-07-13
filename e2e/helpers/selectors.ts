export const selectors = {
  // Navigation
  nav: {
    home: '[data-testid="sidebar-nav-home"]',
    tokenInspector: '[data-testid="sidebar-nav-token-inspector"]',
    tokenComparison: '[data-testid="sidebar-nav-token-comparison"]',
    oidcExplorer: '[data-testid="sidebar-nav-oidc-explorer"]',
    redirectUriDebugger: '[data-testid="sidebar-nav-redirect-uri-debugger"]',
    oauthPlayground: '[data-testid="sidebar-nav-oauth-playground"]',
    authCodePkce: '[data-testid="sidebar-nav-oauth-auth-code"]',
    clientCredentials: '[data-testid="sidebar-nav-oauth-client-credentials"]',
    introspection: '[data-testid="sidebar-nav-oauth-introspection"]',
    userinfo: '[data-testid="sidebar-nav-oauth-userinfo"]',
    scimResourceValidator: '[data-testid="sidebar-nav-scim-resource-validator"]',
    scimPatchBuilder: '[data-testid="sidebar-nav-scim-patch-builder"]',
    totpDebugger: '[data-testid="sidebar-nav-totp-debugger"]',
    ldapFilterStudio: '[data-testid="sidebar-nav-ldap-filter-studio"]',
  },

  // Common buttons
  buttons: {
    example: '[data-testid="token-inspector-example-button"]',
    clear: '[data-testid="token-inspector-clear-button"]',
    reset: '[data-testid="token-inspector-clear-button"]',
    fetchConfig: '[data-testid="oidc-explorer-fetch-config-button"]',
    inspectToken: '[data-testid="token-inspector-inspect-button"]',
  },

  // Home cards
  home: {
    tokenInspector: '[data-testid="home-card-token-inspector"]',
    tokenComparison: '[data-testid="home-card-token-comparison"]',
    oidcExplorer: '[data-testid="home-card-oidc-explorer"]',
    oauthPlayground: '[data-testid="home-card-oauth-playground"]',
    redirectUriDebugger: '[data-testid="home-card-redirect-uri-debugger"]',
    scimResourceValidator: '[data-testid="home-card-scim-resource-validator"]',
    scimPatchBuilder: '[data-testid="home-card-scim-patch-builder"]',
    totpDebugger: '[data-testid="home-card-totp-debugger"]',
    ldapFilterStudio: '[data-testid="home-card-ldap-filter-studio"]',
  },

  // Token Inspector
  tokenInspector: {
    tokenInput: '#token-input',
    headerTab: '[data-testid="token-inspector-tab-header"]',
    payloadTab: '[data-testid="token-inspector-tab-payload"]',
    signatureTab: '[data-testid="token-inspector-tab-signature"]',
    timelineTab: '[data-testid="token-inspector-tab-timeline"]',
    signatureValid: 'text=Signature Valid',
    tokenSizeToggle: '[data-testid="token-inspector-token-size-toggle"]',
  },

  // OIDC Explorer
  oidcExplorer: {
    urlInput: '[data-testid="oidc-explorer-issuer-input"]',
    randomExample: '[data-testid="oidc-explorer-random-issuer-button"]',
    schemePrefix: '[data-testid="issuer-url-scheme"]',
    fetchConfigButton: '[data-testid="oidc-explorer-fetch-config-button"]',
    configTab: '[data-testid="oidc-explorer-tab-config"]',
  },

  // OAuth Playground
  oauthPlayground: {
    demoModeSwitch: '#demo-mode-switch',
    authUrlInput: '#oauth-authcode-authorization-endpoint',
    tokenUrlInput: '#oauth-authcode-token-endpoint',
    clientIdInput: '#oauth-client-id',
    clientSecretInput: '#oauth-client-secret',
    scopeInput: 'input[placeholder*="openid profile email"]',
    startAuthButton: '[data-testid="oauth-authcode-continue-button"]',
    tabConfig: '[data-testid="oauth-authcode-tab-config"]',
    tabAuth: '[data-testid="oauth-authcode-tab-auth"]',
    tabToken: '[data-testid="oauth-authcode-tab-token"]',
    launchAuthorizationButton: '[data-testid="oauth-authcode-launch-authorization-button"]',
    preflightPanel: '[data-testid="oidc-preflight-panel"]',
    preflightRunButton: '[data-testid="oidc-preflight-run-button"]',
    preflightReport: '[data-testid="oidc-preflight-report"]',
    preflightRawReport: '[data-testid="oidc-preflight-raw-report"]',
    issuerHistoryButton: 'button[aria-label="Recent Issuers"]',
    clientCredentialsTokenEndpointInput:
      '[data-testid="oauth-client-credentials-token-endpoint-input"]',
    clientCredentialsSubmitButton: '[data-testid="oauth-client-credentials-submit-button"]',
    introspectionEndpointInput: '[data-testid="oauth-introspection-endpoint-input"]',
    introspectionTokenInput: '[data-testid="oauth-introspection-token-input"]',
    introspectionSubmitButton: '[data-testid="oauth-introspection-submit-button"]',
    userInfoEndpointInput: '[data-testid="oauth-userinfo-endpoint-input"]',
    userInfoAccessTokenInput: '[data-testid="oauth-userinfo-access-token-input"]',
    userInfoSubmitButton: '[data-testid="oauth-userinfo-submit-button"]',
  },

  // LDAP
  ldap: {
    schemaInput: '[data-testid="ldap-schema-input"]',
    schemaBuiltInButton: '[data-testid="ldap-schema-built-in-button"]',
    schemaSavedButton: '[data-testid="ldap-schema-saved-button"]',
    schemaSaveButton: '[data-testid="ldap-schema-save-button"]',
    schemaClearButton: '[data-testid="ldap-schema-clear-button"]',
    ldifInput: '[data-testid="ldap-ldif-input"]',
    ldifUploadButton: '[data-testid="ldap-ldif-upload-button"]',
    ldifTemplatesButton: '[data-testid="ldap-ldif-templates-button"]',
    ldifSchemasButton: '[data-testid="ldap-ldif-schemas-button"]',
    ldifClearButton: '[data-testid="ldap-ldif-clear-button"]',
  },

  // Notifications
  toast: {
    success: '[role="status"]',
    error: '[role="status"]',
    close: 'button[aria-label="Close toast"]',
  },
}
