export const TOKEN_INSPECTOR_DESTINATION = '/token-inspector' as const
export const TOKEN_COMPARISON_DESTINATION = '/token-comparison' as const

export const HANDOFF_TTL_MS = 5 * 60 * 1000

export interface HandoffPayloads {
  [TOKEN_INSPECTOR_DESTINATION]: {
    token: string
  }
  [TOKEN_COMPARISON_DESTINATION]: {
    leftToken: string
    rightToken: string
  }
}

export type HandoffDestination = keyof HandoffPayloads

export interface HandoffNavigationState {
  handoffId: string
}

interface StoredHandoff<D extends HandoffDestination = HandoffDestination> {
  version: 1
  destination: D
  createdAt: number
  expiresAt: number
  payload: HandoffPayloads[D]
}

const STORAGE_PREFIX = 'iam-tools:handoff:v1:'
const HANDOFF_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DESTINATIONS = new Set<HandoffDestination>([
  TOKEN_INSPECTOR_DESTINATION,
  TOKEN_COMPARISON_DESTINATION,
])
const removalTimers = new Map<string, number>()
let lifecycleCleanupInitialized = false

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isAllowedDestination(value: unknown): value is HandoffDestination {
  return typeof value === 'string' && DESTINATIONS.has(value as HandoffDestination)
}

function isPayloadForDestination<D extends HandoffDestination>(
  destination: D,
  payload: unknown
): payload is HandoffPayloads[D] {
  if (!isRecord(payload)) return false

  if (destination === TOKEN_INSPECTOR_DESTINATION) {
    return isNonEmptyString(payload.token)
  }

  return isNonEmptyString(payload.leftToken) && isNonEmptyString(payload.rightToken)
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function createHandoffId(): string | null {
  try {
    return globalThis.crypto.randomUUID()
  } catch {
    return null
  }
}

function storageKey(handoffId: string): string {
  return `${STORAGE_PREFIX}${handoffId}`
}

function cancelScheduledRemoval(key: string): void {
  const timer = removalTimers.get(key)
  if (timer === undefined || typeof window === 'undefined') return

  window.clearTimeout(timer)
  removalTimers.delete(key)
}

function removeHandoff(storage: Storage, key: string): boolean {
  try {
    storage.removeItem(key)
    if (storage.getItem(key) !== null) return false
  } catch {
    // Storage may become unavailable while the page is open.
    return false
  }

  cancelScheduledRemoval(key)
  return true
}

function scheduleRemoval(storage: Storage, key: string, expiresAt: number): void {
  if (typeof window === 'undefined') return

  cancelScheduledRemoval(key)
  const delay = Math.max(0, expiresAt - Date.now())
  const timer = window.setTimeout(() => {
    removalTimers.delete(key)
    removeHandoff(storage, key)
  }, delay)
  removalTimers.set(key, timer)
}

/**
 * Removes expired or malformed handoff entries without touching unrelated
 * session storage owned by the app or host page.
 */
export function purgeExpiredHandoffs(now = Date.now()): void {
  const storage = getSessionStorage()
  if (!storage) return

  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
  } catch {
    return
  }

  for (const key of keys) {
    try {
      const serialized = storage.getItem(key)
      const handoff: unknown = serialized ? JSON.parse(serialized) : null
      if (
        !HANDOFF_ID_PATTERN.test(key.slice(STORAGE_PREFIX.length)) ||
        !isRecord(handoff) ||
        handoff.version !== 1 ||
        !isAllowedDestination(handoff.destination) ||
        !isPayloadForDestination(handoff.destination, handoff.payload) ||
        typeof handoff.createdAt !== 'number' ||
        !Number.isFinite(handoff.createdAt) ||
        typeof handoff.expiresAt !== 'number' ||
        !Number.isFinite(handoff.expiresAt) ||
        handoff.createdAt > now ||
        handoff.expiresAt <= now ||
        handoff.expiresAt - handoff.createdAt !== HANDOFF_TTL_MS
      ) {
        removeHandoff(storage, key)
      } else {
        scheduleRemoval(storage, key, handoff.expiresAt)
      }
    } catch {
      removeHandoff(storage, key)
    }
  }
}

export function initializeHandoffCleanup(): void {
  purgeExpiredHandoffs()

  if (
    lifecycleCleanupInitialized ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return
  }

  const refreshCleanup = () => {
    if (document.visibilityState === 'visible') purgeExpiredHandoffs()
  }

  window.addEventListener('pageshow', () => purgeExpiredHandoffs())
  document.addEventListener('visibilitychange', refreshCleanup)
  lifecycleCleanupInitialized = true
}

export function clearHandoffs(): boolean {
  const storage = getSessionStorage()
  if (!storage) return false

  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key)
    }
  } catch {
    return false
  }

  let cleared = true
  for (const key of keys) {
    if (!removeHandoff(storage, key)) cleared = false
  }

  for (const key of removalTimers.keys()) {
    try {
      if (storage.getItem(key) === null) cancelScheduledRemoval(key)
    } catch {
      cleared = false
    }
  }

  return cleared
}

export function getHandoffIdFromNavigationState(state: unknown): string | null {
  if (!isRecord(state) || !isNonEmptyString(state.handoffId)) return null
  return HANDOFF_ID_PATTERN.test(state.handoffId) ? state.handoffId : null
}

export function createHandoff<D extends HandoffDestination>(
  destination: D,
  payload: HandoffPayloads[D]
): HandoffNavigationState | null {
  if (!isAllowedDestination(destination) || !isPayloadForDestination(destination, payload)) {
    return null
  }

  const storage = getSessionStorage()
  const handoffId = createHandoffId()
  if (!storage || !handoffId) return null

  purgeExpiredHandoffs()
  const createdAt = Date.now()
  const expiresAt = createdAt + HANDOFF_TTL_MS
  const handoff: StoredHandoff<D> = {
    version: 1,
    destination,
    createdAt,
    expiresAt,
    payload,
  }

  try {
    const key = storageKey(handoffId)
    storage.setItem(key, JSON.stringify(handoff))
    scheduleRemoval(storage, key, expiresAt)
    return { handoffId }
  } catch {
    return null
  }
}

export function consumeHandoff<D extends HandoffDestination>(
  handoffId: string,
  destination: D
): HandoffPayloads[D] | null {
  purgeExpiredHandoffs()

  if (!HANDOFF_ID_PATTERN.test(handoffId) || !isAllowedDestination(destination)) {
    return null
  }

  const storage = getSessionStorage()
  if (!storage) return null

  let serialized: string | null
  try {
    const key = storageKey(handoffId)
    serialized = storage.getItem(key)
    if (serialized && !removeHandoff(storage, key)) return null
  } catch {
    return null
  }

  if (!serialized) return null

  try {
    const handoff: unknown = JSON.parse(serialized)
    if (
      !isRecord(handoff) ||
      handoff.version !== 1 ||
      handoff.destination !== destination ||
      !isAllowedDestination(handoff.destination) ||
      typeof handoff.createdAt !== 'number' ||
      !Number.isFinite(handoff.createdAt) ||
      typeof handoff.expiresAt !== 'number' ||
      !Number.isFinite(handoff.expiresAt) ||
      handoff.createdAt > Date.now() ||
      handoff.expiresAt <= Date.now() ||
      handoff.expiresAt - handoff.createdAt !== HANDOFF_TTL_MS ||
      !isPayloadForDestination(destination, handoff.payload)
    ) {
      return null
    }

    return handoff.payload
  } catch {
    return null
  }
}
