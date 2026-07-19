import { Hono } from 'hono'
import type { Bindings } from '../index'
import { requireEditKey } from '../lib/auth'

const share = new Hono<{ Bindings: Bindings }>()

function generateToken(): string {
  const arr = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 共有トークンの管理は編集キー保護。 照合そのものは requireReadAccess (auth.ts) が行う。

share.get('/', requireEditKey, async (c) => {
  const row = await c.env.DB.prepare('SELECT token FROM share_tokens ORDER BY created_at DESC LIMIT 1')
    .first<{ token: string }>()
  return c.json({ token: row?.token ?? null })
})

// 発行 / 再発行: 既存トークンを全て無効化して新規 1 本に置き換える。
share.post('/', requireEditKey, async (c) => {
  const token = generateToken()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM share_tokens'),
    c.env.DB.prepare('INSERT INTO share_tokens (token) VALUES (?)').bind(token),
  ])
  return c.json({ token }, 201)
})

share.delete('/', requireEditKey, async (c) => {
  await c.env.DB.prepare('DELETE FROM share_tokens').run()
  return c.json({ ok: true })
})

export default share
