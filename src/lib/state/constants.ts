/**
 * Constants for state management
 */

// Storage keys
export const STORAGE_KEYS = {
  APP_STATE: 'iam-tools-app-state',
  TOKEN_HISTORY: 'iam-tools-token-history',
  ISSUER_HISTORY: 'iam-tools-issuer-history',
  ENVIRONMENT_PROFILES: 'iam-tools-environment-profiles',
  USER_SETTINGS: 'iam-tools-user-settings',
}

// Max history items
export const DEFAULT_MAX_HISTORY_ITEMS = 10

// Version for schema migrations
export const STATE_VERSION = '1.0'
