import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '../../hooks/use-local-storage';
import { TokenHistoryItem, IssuerHistoryItem, UserSettings, initialAppState } from './types';
import { STORAGE_KEYS } from './constants';
import { 
  addTokenToHistory, 
  addIssuerToHistory,
  updateTokenInHistory,
  updateIssuerInHistory,
  removeTokenFromHistory,
  removeIssuerFromHistory,
  clearTokenHistory,
  clearIssuerHistory
} from './utils';

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
    initialAppState.tokenHistory
  );
  
  const [issuerHistory, setIssuerHistory] = useLocalStorage<IssuerHistoryItem[]>(
    STORAGE_KEYS.ISSUER_HISTORY,
    initialAppState.issuerHistory
  );
  
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    STORAGE_KEYS.USER_SETTINGS,
    initialAppState.settings
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
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    setSettings(initialAppState.settings);
  }, [setSettings]);

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
