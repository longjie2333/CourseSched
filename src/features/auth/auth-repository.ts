import type { KeyValueStorage } from '../../shared/storage'
import type { AuthSession, AuthState, LegacySession } from './auth-types'

export const AUTH_SESSION_KEY = 'session:v2'
const LEGACY_AUTH_KEY = 'config'

const identityHash = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const isLegacySession = (value: unknown): value is LegacySession => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LegacySession>
  return candidate.mode === 'legacy' && Boolean(candidate.username && candidate.password)
}

const isTokenSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AuthSession>
  return candidate.mode === 'token' &&
    typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0 &&
    typeof candidate.expiresAt === 'number' && Number.isFinite(candidate.expiresAt)
}

export class AuthRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  migrateLegacy(): AuthSession | undefined {
    const current = this.getSession()
    if (current) return current

    const legacy = this.storage.get<{ username?: string; password?: string }>(LEGACY_AUTH_KEY)
    if (!legacy?.username || !legacy.password) return undefined

    const session: LegacySession = {
      mode: 'legacy',
      username: legacy.username,
      password: legacy.password,
    }
    this.storage.set(AUTH_SESSION_KEY, session)
    this.storage.remove(LEGACY_AUTH_KEY)
    return session
  }

  getSession(): AuthSession | undefined {
    const value = this.storage.get<unknown>(AUTH_SESSION_KEY)
    if (isLegacySession(value) || isTokenSession(value)) return value
    if (value !== undefined) this.storage.remove(AUTH_SESSION_KEY)
    return undefined
  }

  getActiveSession(now = Date.now()): AuthSession | undefined {
    const session = this.getSession()
    if (!session || (session.mode === 'token' && session.expiresAt <= now)) return undefined
    return session
  }

  setLegacySession(username: string, password: string): void {
    this.storage.set<LegacySession>(AUTH_SESSION_KEY, {
      mode: 'legacy',
      username: username.trim(),
      password,
    })
  }

  setTokenSession(accessToken: string, expiresAt: number): void {
    this.storage.set<AuthSession>(AUTH_SESSION_KEY, {
      mode: 'token',
      accessToken,
      expiresAt,
    })
  }

  getState(now = Date.now()): AuthState {
    const session = this.getActiveSession(now)
    if (!session) return { isAuthenticated: false, mode: 'none' }
    return { isAuthenticated: true, mode: session.mode }
  }

  getAccountKey(now = Date.now()): string | undefined {
    const session = this.getActiveSession(now)
    if (!session) return undefined
    const identity = session.mode === 'legacy' ? session.username.trim() : session.accessToken
    return `${session.mode}:${identityHash(identity)}`
  }

  clearSession(): void {
    this.storage.remove(AUTH_SESSION_KEY)
    this.storage.remove(LEGACY_AUTH_KEY)
  }
}
