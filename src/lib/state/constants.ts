/**
 * Constants for state management
 */

// Storage keys
export const STORAGE_KEYS = {
  APP_STATE: 'iam-tools-app-state',
  TOKEN_HISTORY: 'iam-tools-token-history',
  ISSUER_HISTORY: 'iam-tools-issuer-history',
  USER_SETTINGS: 'iam-tools-user-settings',
  // New storage keys for feature-specific states
  TOKEN_INSPECTOR_STATE: 'iam-tools-token-inspector-state',
  OAUTH_STATE: 'iam-tools-oauth-state',
  OAUTH_CONFIGS: 'iam-tools-oauth-configs',
  OIDC_EXPLORER_STATE: 'iam-tools-oidc-explorer-state',
  ACTIVE_TOKEN_ID: 'iam-tools-active-token-id',
};

// Max history items
export const DEFAULT_MAX_HISTORY_ITEMS = 10;

// Version for schema migrations
export const STATE_VERSION = '1.1';