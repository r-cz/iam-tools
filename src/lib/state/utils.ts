import { v4 as uuidv4 } from 'uuid'
import {
  TokenHistoryItem,
  IssuerHistoryItem,
  EnvironmentProfile,
  EnvironmentProfileDraft,
} from './types'
import { DEFAULT_MAX_HISTORY_ITEMS } from './constants'
import { decodeJwtPayload } from '@/lib/jwt/decode-token'

/**
 * Generate a unique ID for history items
 */
export function generateId(): string {
  return uuidv4()
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
  const existingIndex = history.findIndex((item) => item.token === token)
  const timestamp = Date.now()

  if (existingIndex >= 0) {
    // Update existing token's lastUsedAt
    const updatedHistory = [...history]
    updatedHistory[existingIndex] = {
      ...updatedHistory[existingIndex],
      lastUsedAt: timestamp,
    }
    return updatedHistory
  }

  // Try to extract subject and issuer from token
  let subject: string | undefined
  let issuer: string | undefined

  try {
    const payload = decodeJwtPayload(token)
    if (payload) {
      subject = typeof payload.sub === 'string' ? payload.sub : undefined
      issuer = typeof payload.iss === 'string' ? payload.iss : undefined
    }
  } catch (error) {
    if (import.meta?.env?.DEV) {
      console.error('Error extracting token data:', error)
    }
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
  }

  // Add new item and limit history size
  return [newItem, ...history].slice(0, maxItems)
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
  const existingIndex = history.findIndex((item) => item.url === url)
  const timestamp = Date.now()

  if (existingIndex >= 0) {
    // Update existing URL's lastUsedAt
    const updatedHistory = [...history]
    updatedHistory[existingIndex] = {
      ...updatedHistory[existingIndex],
      lastUsedAt: timestamp,
    }
    return updatedHistory
  }

  // Add new URL to history
  const newItem: IssuerHistoryItem = {
    id: generateId(),
    url,
    createdAt: timestamp,
    lastUsedAt: timestamp,
  }

  // Add new item and limit history size
  return [newItem, ...history].slice(0, maxItems)
}

function normalizeOptionalString(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function sanitizeEnvironmentProfileDraft(
  profile: EnvironmentProfileDraft
): EnvironmentProfileDraft {
  return {
    name: profile.name.trim(),
    issuerUrl: profile.issuerUrl.trim(),
    authorizationEndpoint: normalizeOptionalString(profile.authorizationEndpoint),
    tokenEndpoint: normalizeOptionalString(profile.tokenEndpoint),
    jwksEndpoint: normalizeOptionalString(profile.jwksEndpoint),
    introspectionEndpoint: normalizeOptionalString(profile.introspectionEndpoint),
    userInfoEndpoint: normalizeOptionalString(profile.userInfoEndpoint),
    clientId: normalizeOptionalString(profile.clientId),
    scopes: profile.scopes.map((scope) => scope.trim()).filter(Boolean),
  }
}

export function sortEnvironmentProfiles(profiles: EnvironmentProfile[]): EnvironmentProfile[] {
  return [...profiles].sort((left, right) => {
    if (right.lastUsedAt !== left.lastUsedAt) {
      return right.lastUsedAt - left.lastUsedAt
    }

    if (right.updatedAt !== left.updatedAt) {
      return right.updatedAt - left.updatedAt
    }

    return left.name.localeCompare(right.name)
  })
}

export function saveEnvironmentProfile(
  profiles: EnvironmentProfile[],
  profile: EnvironmentProfileDraft
): {
  profiles: EnvironmentProfile[]
  savedProfile: EnvironmentProfile
} {
  const timestamp = Date.now()
  const sanitizedProfile = sanitizeEnvironmentProfileDraft(profile)
  const savedProfile: EnvironmentProfile = {
    id: generateId(),
    ...sanitizedProfile,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: timestamp,
  }

  return {
    profiles: sortEnvironmentProfiles([savedProfile, ...profiles]),
    savedProfile,
  }
}

export function updateEnvironmentProfile(
  profiles: EnvironmentProfile[],
  id: string,
  updates: Partial<EnvironmentProfileDraft>
): {
  profiles: EnvironmentProfile[]
  updatedProfile: EnvironmentProfile | null
} {
  const existingProfile = profiles.find((profile) => profile.id === id)
  if (!existingProfile) {
    return { profiles, updatedProfile: null }
  }

  const timestamp = Date.now()
  const sanitizedProfile = sanitizeEnvironmentProfileDraft({
    name: updates.name ?? existingProfile.name,
    issuerUrl: updates.issuerUrl ?? existingProfile.issuerUrl,
    authorizationEndpoint: updates.authorizationEndpoint ?? existingProfile.authorizationEndpoint,
    tokenEndpoint: updates.tokenEndpoint ?? existingProfile.tokenEndpoint,
    jwksEndpoint: updates.jwksEndpoint ?? existingProfile.jwksEndpoint,
    introspectionEndpoint: updates.introspectionEndpoint ?? existingProfile.introspectionEndpoint,
    userInfoEndpoint: updates.userInfoEndpoint ?? existingProfile.userInfoEndpoint,
    clientId: updates.clientId ?? existingProfile.clientId,
    scopes: updates.scopes ?? existingProfile.scopes,
  })

  const updatedProfile: EnvironmentProfile = {
    ...existingProfile,
    ...sanitizedProfile,
    updatedAt: timestamp,
  }

  return {
    profiles: sortEnvironmentProfiles(
      profiles.map((profile) => (profile.id === id ? updatedProfile : profile))
    ),
    updatedProfile,
  }
}

export function markEnvironmentProfileUsed(
  profiles: EnvironmentProfile[],
  id: string
): {
  profiles: EnvironmentProfile[]
  updatedProfile: EnvironmentProfile | null
} {
  const existingProfile = profiles.find((profile) => profile.id === id)
  if (!existingProfile) {
    return { profiles, updatedProfile: null }
  }

  const timestamp = Date.now()
  const updatedProfile: EnvironmentProfile = {
    ...existingProfile,
    lastUsedAt: timestamp,
  }

  return {
    profiles: sortEnvironmentProfiles(
      profiles.map((profile) => (profile.id === id ? updatedProfile : profile))
    ),
    updatedProfile,
  }
}

export function removeEnvironmentProfile(
  profiles: EnvironmentProfile[],
  id: string
): EnvironmentProfile[] {
  return profiles.filter((profile) => profile.id !== id)
}

export function clearEnvironmentProfiles(): EnvironmentProfile[] {
  return []
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
  return history.map((item) => (item.id === id ? { ...item, ...updates } : item))
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
  return history.map((item) => (item.id === id ? { ...item, ...updates } : item))
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
  return history.filter((item) => item.id !== id)
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
  return history.filter((item) => item.id !== id)
}

/**
 * Clear token history
 * @returns Empty token history
 */
export function clearTokenHistory(): TokenHistoryItem[] {
  return []
}

/**
 * Clear issuer history
 * @returns Empty issuer history
 */
export function clearIssuerHistory(): IssuerHistoryItem[] {
  return []
}
