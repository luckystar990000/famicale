import { buildPushPayload, type PushSubscription, type PushMessage } from '@block65/webcrypto-web-push'
import type { Bindings } from '../index'

// VAPID 公開鍵 (公開情報、 web 側 lib/push.ts と同一ペア)。 秘密鍵は secret VAPID_PRIVATE_KEY。
const VAPID_PUBLIC_KEY = 'BAnXYDhxtkPRF20mriIsTbrIUMUSz3VcK6idnPo992vIB5FSePWThj3mPlUf-ABwIBXI12KlWxlSuDkbvjfu9vI'
const VAPID_SUBJECT = 'mailto:luckystar.990000@gmail.com'

type SubRow = {
  endpoint: string
  p256dh: string
  auth: string
}

// JST の「明日」を YYYY-MM-DD で返す。 Workers の Date は UTC なので +9h してから +1 日。
export function tomorrowJst(now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000)
  jst.setUTCDate(jst.getUTCDate() + 1)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 全購読者へ push を送る。 期限切れ購読 (404/410) は D1 から掃除する。
export async function sendToAll(env: Bindings, message: PushMessage): Promise<{ sent: number; pruned: number }> {
  const { results } = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions'
  ).all<SubRow>()

  const vapid = { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
  let sent = 0
  let pruned = 0

  for (const row of results) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }
    try {
      const payload = await buildPushPayload(message, subscription, vapid)
      const res = await fetch(subscription.endpoint, payload)
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(row.endpoint).run()
        pruned++
      } else if (res.ok || res.status === 201) {
        sent++
      } else {
        console.error('push send failed', res.status, await res.text())
      }
    } catch (err) {
      console.error('push send error', err)
    }
  }
  return { sent, pruned }
}

// 前日通知: 明日 (JST) が対象日の予定を集めて全購読者へ。 対象日 = visitDate 優先、 中止と「行った」済みは除外。
export async function sendTomorrowReminder(env: Bindings): Promise<{ sent: number; count: number }> {
  const tomorrow = tomorrowJst()
  const { results } = await env.DB.prepare(
    `SELECT title FROM schedules
     WHERE status = 'active' AND visited_date IS NULL
       AND COALESCE(visit_date, start_date) = ?
     ORDER BY COALESCE(start_time, '99'), title`
  ).bind(tomorrow).all<{ title: string }>()

  if (results.length === 0) return { sent: 0, count: 0 }

  const titles = results.map(r => r.title)
  const body = `明日: ${titles.join('、')}`
  const { sent } = await sendToAll(env, {
    data: { title: 'ファミカレ', body, url: '/' },
    options: { ttl: 12 * 3600, urgency: 'normal' },
  })
  return { sent, count: results.length }
}
