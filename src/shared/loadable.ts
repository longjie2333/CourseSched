export type RefreshResult<T> =
  | { kind: 'updated'; snapshot: T }
  | { kind: 'not-modified'; snapshot: T }
  | { kind: 'offline'; snapshot?: T }
  | { kind: 'auth-required' }
