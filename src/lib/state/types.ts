/**
 * Types for application state management
 */

// Token history item
export interface TokenHistoryItem {
  id: string;
  token: string;
  name?: string;
  createdAt: number;
  lastUsedAt: number;
  type?: string;
  issuer?: string;
  subject?: string;
}

// OIDC issuer URL history item
export interface IssuerHistoryItem {
  id: string;
  url: string;
  name?: string;
  createdAt: number;
  lastUsedAt: number;
}

// OAuth Config History
export interface OAuthConfigHistoryItem {
  id: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  issuerUrl?: string;
  flowType: string;
  createdAt: number;
  lastUsedAt: number;
  name?: string;
  demoMode: boolean;
}

// OAuth State
export interface OAuthState {
  configs: OAuthConfigHistoryItem[];
  activeConfigId?: string;
  lastFlowType: string;
  lastDemoMode: boolean;
}

// OIDC Explorer State
export interface OidcExplorerState {
  lastIssuerUrl?: string;
  recentJwks: {
    [issuerUrl: string]: {
      keys: any[];
      timestamp: number;
    };
  };
  displayPreferences: {
    showOptionalFields: boolean;
    groupByCategory: boolean;
  };
}

// Token Inspector State
export interface TokenInspectorState {
  activeTokenId?: string;
  validationPreferences: {
    autoValidate: boolean;
    autoFetchJwks: boolean;
  };
  displayPreferences: {
    defaultTab: string;
    showExpiredClaims: boolean;
  };
}

// User settings
export interface UserSettings {
  maxHistoryItems: number;
  tokenDisplayFormat: 'decoded' | 'encoded';
  enableDetailedValidation: boolean;
  defaultTab: string;
  theme?: 'dark' | 'light' | 'system';
  // New settings
  preserveStateAcrossTools: boolean;
}

// App state
export interface AppState {
  tokenHistory: TokenHistoryItem[];
  issuerHistory: IssuerHistoryItem[];
  settings: UserSettings;
  // Feature-specific states
  tokenInspector: TokenInspectorState;
  oauth: OAuthState;
  oidcExplorer: OidcExplorerState;
}

// Initial app state
export const initialAppState: AppState = {
  tokenHistory: [],
  issuerHistory: [],
  settings: {
    maxHistoryItems: 10,
    tokenDisplayFormat: 'decoded',
    enableDetailedValidation: true,
    defaultTab: 'payload',
    theme: 'system',
    preserveStateAcrossTools: true,
  },
  tokenInspector: {
    activeTokenId: undefined,
    validationPreferences: {
      autoValidate: true,
      autoFetchJwks: true,
    },
    displayPreferences: {
      defaultTab: 'payload',
      showExpiredClaims: true,
    },
  },
  oauth: {
    configs: [],
    activeConfigId: undefined,
    lastFlowType: 'authorization_code_pkce',
    lastDemoMode: false,
  },
  oidcExplorer: {
    lastIssuerUrl: undefined,
    recentJwks: {},
    displayPreferences: {
      showOptionalFields: true,
      groupByCategory: true,
    },
  },
};