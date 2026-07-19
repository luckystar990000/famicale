// Web Push (前日通知)。 VAPID 公開鍵は公開情報。 秘密鍵は Worker secret VAPID_PRIVATE_KEY。
// iOS はホーム画面に追加した PWA (standalone) + iOS 16.4 以降でのみ Web Push が使える。
export const VAPID_PUBLIC_KEY = 'BAnXYDhxtkPRF20mriIsTbrIUMUSz3VcK6idnPo992vIB5FSePWThj3mPlUf-ABwIBXI12KlWxlSuDkbvjfu9vI'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

// 通知を有効化: 許可を取り、 購読を作って D1 に登録。 成功で true。
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  const json = sub.toJSON()
  const res = await fetch(`${BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  return res.ok
}

// 通知を無効化: 購読解除 + D1 から削除。
export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await fetch(`${BASE}/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {})
}
