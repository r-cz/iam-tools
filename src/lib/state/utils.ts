import { v4 as uuidv4 } from 'uuid';
import { 
  TokenHistoryItem, 
  IssuerHistoryItem, 
  OAuthConfigHistoryItem,
  OAuthState
} from './types';
import { DEFAULT_MAX_HISTORY_ITEMS } from './constants';

/**
 * Generate a unique ID for history items
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Decodes a JWT token to extract its payload
 * @param token JWT token to decode
 * @returns The decoded payload or null if invalid
 */
function decodeJwtPayload(token: string): any | null {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = JSON.parse(atob(base64));
    
    return decodedPayload;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Add a token to history, maintaining max size
 * @param history Current token history
 * @param token Token to add
 * @param maxItems Maximum history items to keep
 * @returns Updated token history
 */
export function addTokenToHistory(
  history: TokenHistoryItem[],
  token: string,
  maxItems: number = DEFAULT_MAX_HISTORY_ITEMS
): TokenHistoryItem[] {
  // Check if token already exists in history
  const existingIndex = history.findIndex(item => item.token === token);
  const timestamp = Date.now();
  
  if (existingIndex >= 0) {
    // Update existing token's lastUsedAt
    const updatedHistory = [...history];
    updatedHistory[existingIndex] = {
      ...updatedHistory[existingIndex],
      lastUsedAt: timestamp,
    };
    return updatedHistory;
  }
  
  // Try to extract subject and issuer from token
  let subject: string | undefined;
  let issuer: string | undefined;
  
  try {
    const payload = decodeJwtPayload(token);
    if (payload) {
      subject = payload.sub;
      issuer = payload.iss;
    }
  } catch (error) {
    console.error('Error extracting token data:', error);
  }
  
  // Add new token to history
  const newItem: TokenHistoryItem = {
    id: generateId(),
    token,
    createdAt: timestamp,
    lastUsedAt: timestamp,
    // Include subject and issuer if available
    ...(subject && { subject }),
    ...(issuer && { issuer }),
  };
  
  // Add new item and limit history size
  return [newItem, ...history].slice(0, maxItems);
}

/**
 * Add an issuer URL to history, maintaining max size
 * @param history Current issuer history
 * @param url Issuer URL to add
 * @param maxItems Maximum history items to keep
 * @returns Updated issuer history
 */
export function addIssuerToHistory(
  history: IssuerHistoryItem[],
  url: string,
  maxItems: number = DEFAULT_MAX_HISTORY_ITEMS
): IssuerHistoryItem[] {
  // Check if URL already exists in history
  const existingIndex = history.findIndex(item => item.url === url);
  const timestamp = Date.now();
  
  if (existingIndex >= 0) {
    // Update existing URL's lastUsedAt
    const updatedHistory = [...history];
    updatedHistory[existingIndex] = {
      ...updatedHistory[existingIndex],
      lastUsedAt: timestamp,
    };
    return updatedHistory;
  }
  
  // Add new URL to history
  const newItem: IssuerHistoryItem = {
    id: generateId(),
    url,
    createdAt: timestamp,
    lastUsedAt: timestamp,
  };
  
  // Add new item and limit history size
  return [newItem, ...history].slice(0, maxItems);
}

/**
 * Add an OAuth config to history, maintaining max size
 * @param history Current OAuth config history
 * @param config Config data to add
 * @param maxItems Maximum history items to keep
 * @returns Updated OAuth config history
 */
export function addOAuthConfigToHistory(
  history: OAuthConfigHistoryItem[],
  config: Omit<OAuthConfigHistoryItem, 'id' | 'createdAt' | 'lastUsedAt'>,
  maxItems: number = DEFAULT_MAX_HISTORY_ITEMS
): OAuthConfigHistoryItem[] {
  // Generate a unique identifier for this config
  const configKey = `${config.clientId}|${config.redirectUri}|${config.issuerUrl || 'demo'}`;
  
  // Check if similar config already exists in history
  const existingIndex = history.findIndex(item => 
    `${item.clientId}|${item.redirectUri}|${item.issuerUrl || 'demo'}` === configKey
  );
  const timestamp = Date.now();
  
  if (existingIndex >= 0) {
    // Update existing config's lastUsedAt and potentially other fields
    const updatedHistory = [...history];
    updatedHistory[existingIndex] = {
      ...updatedHistory[existingIndex],
      ...config,
      lastUsedAt: timestamp,
    };
    return updatedHistory;
  }
  
  // Add new config to history
  const newItem: OAuthConfigHistoryItem = {
    id: generateId(),
    ...config,
    createdAt: timestamp,
    lastUsedAt: timestamp,
  };
  
  // Add new item and limit history size
  return [newItem, ...history].slice(0, maxItems);
}

/**
 * Update a token item in history
 * @param history Current token history
 * @param id Token ID to update
 * @param updates Partial updates to apply
 * @returns Updated token history
 */
export function updateTokenInHistory(
  history: TokenHistoryItem[],
  id: string,
  updates: Partial<TokenHistoryItem>
): TokenHistoryItem[] {
  return history.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
}

/**
 * Update an issuer item in history
 * @param history Current issuer history
 * @param id Issuer ID to update
 * @param updates Partial updates to apply
 * @returns Updated issuer history
 */
export function updateIssuerInHistory(
  history: IssuerHistoryItem[],
  id: string,
  updates: Partial<IssuerHistoryItem>
): IssuerHistoryItem[] {
  return history.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
}

/**
 * Update an OAuth config in history
 * @param history Current OAuth config history
 * @param id Config ID to update
 * @param updates Partial updates to apply
 * @returns Updated OAuth config history
 */
export function updateOAuthConfigInHistory(
  history: OAuthConfigHistoryItem[],
  id: string,
  updates: Partial<OAuthConfigHistoryItem>
): OAuthConfigHistoryItem[] {
  return history.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
}

/**
 * Remove a token from history
 * @param history Current token history
 * @param id Token ID to remove
 * @returns Updated token history
 */
export function removeTokenFromHistory(
  history: TokenHistoryItem[],
  id: string
): TokenHistoryItem[] {
  return history.filter(item => item.id !== id);
}

/**
 * Remove an issuer from history
 * @param history Current issuer history
 * @param id Issuer ID to remove
 * @returns Updated issuer history
 */
export function removeIssuerFromHistory(
  history: IssuerHistoryItem[],
  id: string
): IssuerHistoryItem[] {
  return history.filter(item => item.id !== id);
}

/**
 * Remove an OAuth config from history
 * @param history Current OAuth config history
 * @param id Config ID to remove
 * @returns Updated OAuth config history
 */
export function removeOAuthConfigFromHistory(
  history: OAuthConfigHistoryItem[],
  id: string
): OAuthConfigHistoryItem[] {
  return history.filter(item => item.id !== id);
}

/**
 * Update OAuth flow preferences
 * @param state Current OAuth state
 * @param flowType Flow type to set
 * @param demoMode Demo mode to set
 * @returns Updated OAuth state
 */
export function updateOAuthFlowPreferences(
  state: OAuthState,
  flowType: string,
  demoMode: boolean
): OAuthState {
  return {
    ...state,
    lastFlowType: flowType,
    lastDemoMode: demoMode,
  };
}

/**
 * Clear token history
 * @returns Empty token history
 */
export function clearTokenHistory(): TokenHistoryItem[] {
  return [];
}

/**
 * Clear issuer history
 * @returns Empty issuer history
 */
export function clearIssuerHistory(): IssuerHistoryItem[] {
  return [];
}

/**
 * Clear OAuth config history
 * @returns Empty OAuth config history
 */
export function clearOAuthConfigHistory(): OAuthConfigHistoryItem[] {
  return [];
}