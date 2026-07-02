// crypto.randomUUID() は secure context (HTTPS / localhost) でしか動かない
// LAN IP 経由の HTTP アクセスでは例外になるのでフォールバックを用意
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID() } catch { /* fall through */ }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}
