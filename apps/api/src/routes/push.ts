import { Hono } from 'hono'
import type { Bindings } from '../index'
import { requireEditKey } from '../lib/auth'
import { sendToAll, sendTomorrowReminder } from '../lib/notify'

const push = new Hono<{ Bindings: Bindings }>()

// 購読登録。 通知内容は予定情報 (共有 URL で閲覧可能なもの) なので認証は不要。
// endpoint がユニークキー。 同じ端末の再購読は keys を更新。
push.post('/subscribe', async (c) => {
  const body = await c.req.json<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>()
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'invalid subscription' }, 400)
  }
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).bind(crypto.randomUUID(), body.endpoint, body.keys.p256dh, body.keys.auth).run()
  return c.json({ ok: true })
})

push.post('/unsubscribe', async (c) => {
  const body = await c.req.json<{ endpoint?: string }>()
  if (!body.endpoint) return c.json({ error: 'endpoint required' }, 400)
  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
    .bind(body.endpoint).run()
  return c.json({ ok: true })
})

// 動作確認用の手動送信 (編集キー保護)。 body 無しでテスト文面、 ?reminder=1 で本番と同じ前日通知ロジック。
push.post('/test', requireEditKey, async (c) => {
  if (c.req.query('reminder') === '1') {
    const r = await sendTomorrowReminder(c.env)
    return c.json(r)
  }
  const r = await sendToAll(c.env, {
    data: { title: 'ファミカレ', body: 'テスト通知です。 この通知が見えていれば設定完了 🎉', url: '/' },
    options: { ttl: 3600, urgency: 'normal' },
  })
  return c.json(r)
})

export default push
