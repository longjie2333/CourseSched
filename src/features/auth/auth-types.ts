export interface LegacySession {
  mode: 'legacy'
  username: string
  password: string
}

export interface TokenSession {
  mode: 'token'
  accessToken: string
  expiresAt: number
}

export type AuthSession = LegacySession | TokenSession

export interface AuthState {
  isAuthenticated: boolean
  mode: AuthSession['mode'] | 'none'
}
