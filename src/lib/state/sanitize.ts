import {
  initialAppState,
  type EnvironmentProfile,
  type IssuerHistoryItem,
  type TokenHistoryItem,
  type UserSettings,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15
}

function records<T>(value: unknown, parse: (record: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: T[] = []
  for (const record of value) {
    if (!isRecord(record) || typeof record.id !== 'string' || !record.id || seen.has(record.id)) {
      continue
    }
    const parsed = parse(record)
    if (parsed) {
      seen.add(record.id)
      result.push(parsed)
    }
  }
  return result
}

function historyFields(record: Record<string, unknown>) {
  if (!timestamp(record.createdAt) || !timestamp(record.lastUsedAt)) return null
  return {
    id: record.id as string,
    name: text(record.name),
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  }
}

export function sanitizeTokenHistory(value: unknown): TokenHistoryItem[] {
  return records(value, (record) => {
    const fields = historyFields(record)
    if (!fields || typeof record.token !== 'string' || !record.token) return null
    return {
      ...fields,
      token: record.token,
      type: text(record.type),
      issuer: text(record.issuer),
      subject: text(record.subject),
    }
  })
}

export function sanitizeIssuerHistory(value: unknown): IssuerHistoryItem[] {
  return records(value, (record) => {
    const fields = historyFields(record)
    if (!fields || typeof record.url !== 'string' || !record.url) return null
    return { ...fields, url: record.url }
  })
}

export function sanitizeEnvironmentProfiles(value: unknown): EnvironmentProfile[] {
  return records(value, (record) => {
    const fields = historyFields(record)
    if (
      !fields ||
      !fields.name?.trim() ||
      typeof record.issuerUrl !== 'string' ||
      !record.issuerUrl.trim() ||
      !timestamp(record.updatedAt)
    )
      return null

    return {
      ...fields,
      name: fields.name,
      issuerUrl: record.issuerUrl,
      updatedAt: record.updatedAt,
      authorizationEndpoint: text(record.authorizationEndpoint),
      tokenEndpoint: text(record.tokenEndpoint),
      jwksEndpoint: text(record.jwksEndpoint),
      introspectionEndpoint: text(record.introspectionEndpoint),
      userInfoEndpoint: text(record.userInfoEndpoint),
      clientId: text(record.clientId),
      scopes: Array.isArray(record.scopes)
        ? [
            ...new Set(
              record.scopes
                .filter((scope): scope is string => typeof scope === 'string')
                .map((scope) => scope.trim())
                .filter(Boolean)
            ),
          ]
        : [],
    }
  })
}

export function sanitizeUserSettings(value: unknown): UserSettings {
  const defaults = initialAppState.settings
  const record = isRecord(value) ? value : {}
  return {
    maxHistoryItems:
      typeof record.maxHistoryItems === 'number' &&
      Number.isInteger(record.maxHistoryItems) &&
      record.maxHistoryItems > 0 &&
      record.maxHistoryItems <= 100
        ? record.maxHistoryItems
        : defaults.maxHistoryItems,
    persistTokenHistory: record.persistTokenHistory === true,
    tokenDisplayFormat: record.tokenDisplayFormat === 'encoded' ? 'encoded' : 'decoded',
    enableDetailedValidation:
      typeof record.enableDetailedValidation === 'boolean'
        ? record.enableDetailedValidation
        : defaults.enableDetailedValidation,
    defaultTab:
      typeof record.defaultTab === 'string' &&
      ['header', 'payload', 'signature', 'raw'].includes(record.defaultTab)
        ? record.defaultTab
        : defaults.defaultTab,
  }
}
