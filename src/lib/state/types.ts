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

// User settings
export interface UserSettings {
  maxHistoryItems: number
  tokenDisplayFormat: 'decoded' | 'encoded'
  enableDetailedValidation: boolean
  defaultTab: string
  theme?: 'dark' | 'light' | 'system'
}

// App state
export interface AppState {
  tokenHistory: TokenHistoryItem[]
  issuerHistory: IssuerHistoryItem[]
  settings: UserSettings
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
  },
}
