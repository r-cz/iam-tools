/**
 * Types for application state management
 */

// Token history item
export interface TokenHistoryItem {
  id: string
  token: string
  name?: string
  createdAt: number
  lastUsedAt: number
  type?: string
  issuer?: string
  subject?: string
}

// OIDC issuer URL history item
export interface IssuerHistoryItem {
  id: string
  url: string
  name?: string
  createdAt: number
  lastUsedAt: number
}

// Saved OAuth/OIDC environment profile
export interface EnvironmentProfile {
  id: string
  name: string
  issuerUrl: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  jwksEndpoint?: string
  introspectionEndpoint?: string
  userInfoEndpoint?: string
  clientId?: string
  scopes: string[]
  createdAt: number
  updatedAt: number
  lastUsedAt: number
}

// Input used for creating or updating environment profiles
export interface EnvironmentProfileDraft {
  name: string
  issuerUrl: string
  authorizationEndpoint?: string
  tokenEndpoint?: string
  jwksEndpoint?: string
  introspectionEndpoint?: string
  userInfoEndpoint?: string
  clientId?: string
  scopes: string[]
}

// User settings
export interface UserSettings {
  maxHistoryItems: number
  tokenDisplayFormat: 'decoded' | 'encoded'
  enableDetailedValidation: boolean
  defaultTab: string
}

// App state
export interface AppState {
  tokenHistory: TokenHistoryItem[]
  issuerHistory: IssuerHistoryItem[]
  environmentProfiles: EnvironmentProfile[]
  settings: UserSettings
}

// Initial app state
export const initialAppState: AppState = {
  tokenHistory: [],
  issuerHistory: [],
  environmentProfiles: [],
  settings: {
    maxHistoryItems: 10,
    tokenDisplayFormat: 'decoded',
    enableDetailedValidation: true,
    defaultTab: 'payload',
  },
}
