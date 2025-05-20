import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '../../hooks/use-local-storage';
import { 
  TokenHistoryItem, 
  IssuerHistoryItem, 
  UserSettings, 
  initialAppState,
  OAuthConfigHistoryItem,
  OAuthState,
  OidcExplorerState,
  TokenInspectorState
} from './types';
import { STORAGE_KEYS, STATE_VERSION } from './constants';
import { 
  addTokenToHistory, 
  addIssuerToHistory,
  updateTokenInHistory,
  updateIssuerInHistory,
  removeTokenFromHistory,
  removeIssuerFromHistory,
  clearTokenHistory,
  clearIssuerHistory,
  // New utility functions
  addOAuthConfigToHistory,
  updateOAuthConfigInHistory,
  removeOAuthConfigFromHistory,
  clearOAuthConfigHistory,
  updateOAuthFlowPreferences
} from './utils';

/**
 * Helper to migrate data when schema changes
 */
function migrateState<T>(key: string, value: T, version: string): T {
  // Get the stored version metadata
  const storedVersion = localStorage.getItem(`${key}-version`);
  
  if (!storedVersion || storedVersion !== version) {
    console.log(`Migrating state for ${key} from ${storedVersion || 'unknown'} to ${version}`);
    
    // Perform migrations based on version differences
    if (key === STORAGE_KEYS.USER_SETTINGS) {
      const settings = value as any;
      // Add any missing fields from default settings
      const newSettings = {
        ...initialAppState.settings,
        ...settings,
        // Ensure new properties are always set with default values
        preserveStateAcrossTools: settings.preserveStateAcrossTools ?? true
      };
      
      // Update the version after migration
      localStorage.setItem(`${key}-version`, version);
      
      return newSettings as unknown as T;
    }
    
    // Add more migrations for other storage keys as needed
    // For example:
    if (key === STORAGE_KEYS.TOKEN_INSPECTOR_STATE && (!storedVersion || storedVersion < "1.1")) {
      // Cast to any to allow property access
      const state = value as any;
      const newState = {
        ...initialAppState.tokenInspector,
        ...state,
        // Always add/overwrite with the new properties
        validationPreferences: {
          ...initialAppState.tokenInspector.validationPreferences,
          ...(state?.validationPreferences || {})
        },
        displayPreferences: {
          ...initialAppState.tokenInspector.displayPreferences,
          ...(state?.displayPreferences || {})
        }
      };
      
      // Update the version after migration
      localStorage.setItem(`${key}-version`, version);
      
      return newState as unknown as T;
    }
    
    if (key === STORAGE_KEYS.OIDC_EXPLORER_STATE && (!storedVersion || storedVersion < "1.1")) {
      const state = value as any;
      const newState = {
        ...initialAppState.oidcExplorer,
        ...state,
        displayPreferences: {
          ...initialAppState.oidcExplorer.displayPreferences,
          ...(state?.displayPreferences || {})
        }
      };
      
      // Update the version after migration
      localStorage.setItem(`${key}-version`, version);
      
      return newState as unknown as T;
    }
    
    if (key === STORAGE_KEYS.OAUTH_STATE && (!storedVersion || storedVersion < "1.1")) {
      const state = value as any;
      const newState = {
        ...initialAppState.oauth,
        ...state,
        configs: state?.configs || []
      };
      
      // Update the version after migration
      localStorage.setItem(`${key}-version`, version);
      
      return newState as unknown as T;
    }
    
    // For any other keys, just update the version
    localStorage.setItem(`${key}-version`, version);
  }
  
  return value;
}

// Context type
interface AppStateContextType {
  // State values
  tokenHistory: TokenHistoryItem[];
  issuerHistory: IssuerHistoryItem[];
  settings: UserSettings;
  
  // Token history methods
  addToken: (token: string) => void;
  updateToken: (id: string, updates: Partial<TokenHistoryItem>) => void;
  removeToken: (id: string) => void;
  clearTokens: () => void;
  
  // Issuer history methods
  addIssuer: (url: string) => void;
  updateIssuer: (id: string, updates: Partial<IssuerHistoryItem>) => void;
  removeIssuer: (id: string) => void;
  clearIssuers: () => void;
  
  // Settings methods
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  
  // New state and methods for Token Inspector
  tokenInspector: TokenInspectorState;
  setActiveTokenId: (id: string | undefined) => void;
  updateTokenInspectorPreferences: (updates: Partial<TokenInspectorState>) => void;
  
  // New state and methods for OAuth Playground
  oauth: OAuthState;
  addOAuthConfig: (config: Omit<OAuthConfigHistoryItem, 'id' | 'createdAt' | 'lastUsedAt'>) => void;
  updateOAuthConfig: (id: string, updates: Partial<OAuthConfigHistoryItem>) => void;
  removeOAuthConfig: (id: string) => void;
  clearOAuthConfigs: () => void;
  setActiveOAuthConfig: (id: string | undefined) => void;
  updateOAuthFlowPreferences: (flowType: string, demoMode: boolean) => void;
  
  // New state and methods for OIDC Explorer
  oidcExplorer: OidcExplorerState;
  setLastIssuerUrl: (url: string | undefined) => void;
  updateRecentJwks: (issuerUrl: string, keys: any[]) => void;
  updateOidcDisplayPreferences: (prefs: Partial<OidcExplorerState['displayPreferences']>) => void;
}

// Create context with default values
const AppStateContext = createContext<AppStateContextType>({
  // Default state
  tokenHistory: initialAppState.tokenHistory,
  issuerHistory: initialAppState.issuerHistory,
  settings: initialAppState.settings,
  
  // Default no-op functions
  addToken: () => {},
  updateToken: () => {},
  removeToken: () => {},
  clearTokens: () => {},
  
  addIssuer: () => {},
  updateIssuer: () => {},
  removeIssuer: () => {},
  clearIssuers: () => {},
  
  updateSettings: () => {},
  resetSettings: () => {},
  
  // New Token Inspector state and methods
  tokenInspector: initialAppState.tokenInspector,
  setActiveTokenId: () => {},
  updateTokenInspectorPreferences: () => {},
  
  // New OAuth Playground state and methods
  oauth: initialAppState.oauth,
  addOAuthConfig: () => {},
  updateOAuthConfig: () => {},
  removeOAuthConfig: () => {},
  clearOAuthConfigs: () => {},
  setActiveOAuthConfig: () => {},
  updateOAuthFlowPreferences: () => {},
  
  // New OIDC Explorer state and methods
  oidcExplorer: initialAppState.oidcExplorer,
  setLastIssuerUrl: () => {},
  updateRecentJwks: () => {},
  updateOidcDisplayPreferences: () => {},
});

// Provider props
interface AppStateProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for application state
 */
export function AppStateProvider({ children }: AppStateProviderProps) {
  // Use individual storage keys for better performance and separation of concerns
  const [tokenHistory, setTokenHistory] = useLocalStorage<TokenHistoryItem[]>(
    STORAGE_KEYS.TOKEN_HISTORY,
    initialAppState.tokenHistory,
    (stored) => migrateState(STORAGE_KEYS.TOKEN_HISTORY, stored, STATE_VERSION)
  );
  
  const [issuerHistory, setIssuerHistory] = useLocalStorage<IssuerHistoryItem[]>(
    STORAGE_KEYS.ISSUER_HISTORY,
    initialAppState.issuerHistory,
    (stored) => migrateState(STORAGE_KEYS.ISSUER_HISTORY, stored, STATE_VERSION)
  );
  
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    STORAGE_KEYS.USER_SETTINGS,
    initialAppState.settings,
    (stored) => migrateState(STORAGE_KEYS.USER_SETTINGS, stored, STATE_VERSION)
  );
  
  // New state for Token Inspector
  const [tokenInspector, setTokenInspector] = useLocalStorage<TokenInspectorState>(
    STORAGE_KEYS.TOKEN_INSPECTOR_STATE,
    initialAppState.tokenInspector,
    (stored) => migrateState(STORAGE_KEYS.TOKEN_INSPECTOR_STATE, stored, STATE_VERSION)
  );
  
  // New state for OAuth Playground
  const [oauth, setOAuth] = useLocalStorage<OAuthState>(
    STORAGE_KEYS.OAUTH_STATE,
    initialAppState.oauth,
    (stored) => migrateState(STORAGE_KEYS.OAUTH_STATE, stored, STATE_VERSION)
  );
  
  // New state for OIDC Explorer
  const [oidcExplorer, setOidcExplorer] = useLocalStorage<OidcExplorerState>(
    STORAGE_KEYS.OIDC_EXPLORER_STATE,
    initialAppState.oidcExplorer,
    (stored) => migrateState(STORAGE_KEYS.OIDC_EXPLORER_STATE, stored, STATE_VERSION)
  );

  // Token history methods
  const addToken = useCallback((token: string) => {
    setTokenHistory(currentHistory => 
      addTokenToHistory(currentHistory, token, settings.maxHistoryItems)
    );
  }, [setTokenHistory, settings.maxHistoryItems]);

  const updateToken = useCallback((id: string, updates: Partial<TokenHistoryItem>) => {
    setTokenHistory(currentHistory => 
      updateTokenInHistory(currentHistory, id, updates)
    );
  }, [setTokenHistory]);

  const removeToken = useCallback((id: string) => {
    setTokenHistory(currentHistory => 
      removeTokenFromHistory(currentHistory, id)
    );
  }, [setTokenHistory]);

  const clearTokens = useCallback(() => {
    setTokenHistory(clearTokenHistory());
  }, [setTokenHistory]);

  // Issuer history methods
  const addIssuer = useCallback((url: string) => {
    setIssuerHistory(currentHistory => 
      addIssuerToHistory(currentHistory, url, settings.maxHistoryItems)
    );
  }, [setIssuerHistory, settings.maxHistoryItems]);

  const updateIssuer = useCallback((id: string, updates: Partial<IssuerHistoryItem>) => {
    setIssuerHistory(currentHistory => 
      updateIssuerInHistory(currentHistory, id, updates)
    );
  }, [setIssuerHistory]);

  const removeIssuer = useCallback((id: string) => {
    setIssuerHistory(currentHistory => 
      removeIssuerFromHistory(currentHistory, id)
    );
  }, [setIssuerHistory]);

  const clearIssuers = useCallback(() => {
    setIssuerHistory(clearIssuerHistory());
  }, [setIssuerHistory]);

  // Settings methods
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(current => ({ ...current, ...updates }));
    
    // Update the version
    localStorage.setItem(`${STORAGE_KEYS.USER_SETTINGS}-version`, STATE_VERSION);
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    setSettings(initialAppState.settings);
    
    // Update the version
    localStorage.setItem(`${STORAGE_KEYS.USER_SETTINGS}-version`, STATE_VERSION);
  }, [setSettings]);
  
  // Token Inspector methods
  const setActiveTokenId = useCallback((id: string | undefined) => {
    setTokenInspector(current => ({
      ...current,
      activeTokenId: id
    }));
  }, [setTokenInspector]);
  
  const updateTokenInspectorPreferences = useCallback((updates: Partial<TokenInspectorState>) => {
    setTokenInspector(current => ({
      ...current,
      ...updates
    }));
    
    // Update the version
    localStorage.setItem(`${STORAGE_KEYS.TOKEN_INSPECTOR_STATE}-version`, STATE_VERSION);
  }, [setTokenInspector]);
  
  // OAuth Playground methods
  const addOAuthConfig = useCallback((config: Omit<OAuthConfigHistoryItem, 'id' | 'createdAt' | 'lastUsedAt'>) => {
    setOAuth(current => ({
      ...current,
      configs: addOAuthConfigToHistory(current.configs, config, settings.maxHistoryItems)
    }));
  }, [setOAuth, settings.maxHistoryItems]);
  
  const updateOAuthConfig = useCallback((id: string, updates: Partial<OAuthConfigHistoryItem>) => {
    setOAuth(current => ({
      ...current,
      configs: updateOAuthConfigInHistory(current.configs, id, updates)
    }));
  }, [setOAuth]);
  
  const removeOAuthConfig = useCallback((id: string) => {
    setOAuth(current => ({
      ...current,
      configs: removeOAuthConfigFromHistory(current.configs, id),
      activeConfigId: current.activeConfigId === id ? undefined : current.activeConfigId
    }));
  }, [setOAuth]);
  
  const clearOAuthConfigs = useCallback(() => {
    setOAuth(current => ({
      ...current,
      configs: clearOAuthConfigHistory(),
      activeConfigId: undefined
    }));
  }, [setOAuth]);
  
  const setActiveOAuthConfig = useCallback((id: string | undefined) => {
    setOAuth(current => ({
      ...current,
      activeConfigId: id
    }));
  }, [setOAuth]);
  
  const updateOAuthPreferences = useCallback((flowType: string, demoMode: boolean) => {
    setOAuth(current => updateOAuthFlowPreferences(current, flowType, demoMode));
    
    // Update the version
    localStorage.setItem(`${STORAGE_KEYS.OAUTH_STATE}-version`, STATE_VERSION);
  }, [setOAuth]);
  
  // OIDC Explorer methods
  const setLastIssuerUrl = useCallback((url: string | undefined) => {
    setOidcExplorer(current => ({
      ...current,
      lastIssuerUrl: url
    }));
  }, [setOidcExplorer]);
  
  const updateRecentJwks = useCallback((issuerUrl: string, keys: any[]) => {
    setOidcExplorer(current => ({
      ...current,
      recentJwks: {
        ...current.recentJwks,
        [issuerUrl]: {
          keys,
          timestamp: Date.now()
        }
      }
    }));
  }, [setOidcExplorer]);
  
  const updateOidcDisplayPreferences = useCallback((prefs: Partial<OidcExplorerState['displayPreferences']>) => {
    setOidcExplorer(current => ({
      ...current,
      displayPreferences: {
        ...current.displayPreferences,
        ...prefs
      }
    }));
    
    // Update the version
    localStorage.setItem(`${STORAGE_KEYS.OIDC_EXPLORER_STATE}-version`, STATE_VERSION);
  }, [setOidcExplorer]);

  // Construct the context value
  const contextValue: AppStateContextType = {
    // State
    tokenHistory,
    issuerHistory,
    settings,
    
    // Methods
    addToken,
    updateToken,
    removeToken,
    clearTokens,
    
    addIssuer,
    updateIssuer,
    removeIssuer,
    clearIssuers,
    
    updateSettings,
    resetSettings,
    
    // Token Inspector
    tokenInspector,
    setActiveTokenId,
    updateTokenInspectorPreferences,
    
    // OAuth Playground
    oauth,
    addOAuthConfig,
    updateOAuthConfig,
    removeOAuthConfig,
    clearOAuthConfigs,
    setActiveOAuthConfig,
    updateOAuthFlowPreferences: updateOAuthPreferences,
    
    // OIDC Explorer
    oidcExplorer,
    setLastIssuerUrl,
    updateRecentJwks,
    updateOidcDisplayPreferences,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

/**
 * Hook to use the app state
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  
  return context;
}

/**
 * Hook for token history operations
 */
export function useTokenHistory() {
  const { 
    tokenHistory, 
    addToken, 
    updateToken, 
    removeToken, 
    clearTokens 
  } = useAppState();
  
  return {
    tokenHistory,
    addToken,
    updateToken,
    removeToken,
    clearTokens,
  };
}

/**
 * Hook for issuer history operations
 */
export function useIssuerHistory() {
  const { 
    issuerHistory, 
    addIssuer, 
    updateIssuer, 
    removeIssuer, 
    clearIssuers 
  } = useAppState();
  
  return {
    issuerHistory,
    addIssuer,
    updateIssuer,
    removeIssuer,
    clearIssuers,
  };
}

/**
 * Hook for settings operations
 */
export function useSettings() {
  const { settings, updateSettings, resetSettings } = useAppState();
  
  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

/**
 * Hook for token inspector operations
 */
export function useTokenInspector() {
  const { 
    tokenInspector, 
    tokenHistory,
    setActiveTokenId, 
    updateTokenInspectorPreferences 
  } = useAppState();
  
  // Find the active token in the history
  const activeToken = React.useMemo(() => {
    if (!tokenInspector.activeTokenId) return undefined;
    return tokenHistory.find(token => token.id === tokenInspector.activeTokenId);
  }, [tokenInspector.activeTokenId, tokenHistory]);
  
  return {
    activeToken,
    activeTokenId: tokenInspector.activeTokenId,
    validationPreferences: tokenInspector.validationPreferences,
    displayPreferences: tokenInspector.displayPreferences,
    setActiveTokenId,
    updatePreferences: updateTokenInspectorPreferences,
  };
}

/**
 * Hook for OAuth playground operations
 */
export function useOAuthPlayground() {
  const { 
    oauth,
    addOAuthConfig,
    updateOAuthConfig,
    removeOAuthConfig,
    clearOAuthConfigs,
    setActiveOAuthConfig,
    updateOAuthFlowPreferences
  } = useAppState();
  
  // Find the active config in the history
  const activeConfig = React.useMemo(() => {
    if (!oauth.activeConfigId) return undefined;
    return oauth.configs.find(config => config.id === oauth.activeConfigId);
  }, [oauth.activeConfigId, oauth.configs]);
  
  return {
    configs: oauth.configs,
    activeConfig,
    activeConfigId: oauth.activeConfigId,
    lastFlowType: oauth.lastFlowType,
    lastDemoMode: oauth.lastDemoMode,
    addConfig: addOAuthConfig,
    updateConfig: updateOAuthConfig,
    removeConfig: removeOAuthConfig,
    clearConfigs: clearOAuthConfigs,
    setActiveConfig: setActiveOAuthConfig,
    updateFlowPreferences: updateOAuthFlowPreferences
  };
}

/**
 * Hook for OIDC explorer operations
 */
export function useOidcExplorer() {
  const {
    oidcExplorer,
    setLastIssuerUrl,
    updateRecentJwks,
    updateOidcDisplayPreferences
  } = useAppState();
  
  return {
    lastIssuerUrl: oidcExplorer.lastIssuerUrl,
    recentJwks: oidcExplorer.recentJwks,
    displayPreferences: oidcExplorer.displayPreferences,
    setLastIssuerUrl,
    updateRecentJwks,
    updateDisplayPreferences: updateOidcDisplayPreferences
  };
}