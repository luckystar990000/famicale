import type { Context, Next } from 'hono'
import type { Bindings } from '../index'

type Ctx = Context<{ Bindings: Bindings }>

function hasEditKey(c: Ctx): boolean {
  const key = c.req.header('X-Edit-Key')
  return !!key && key === c.env.EDIT_KEY
}

// 書き込み系 API を編集キーで保護する。 X-Edit-Key ヘッダを Worker secret EDIT_KEY と照合。
// 夫婦 2 人が同じキーを共有して書き込む方式 (誰が編集したかは記録しない)。
export async function requireEditKey(c: Ctx, next: Next) {
  if (!hasEditKey(c)) return c.json({ error: 'unauthorized' }, 401)
  await next()
}

// 閲覧系 (GET) の保護: 編集キー or 有効な共有トークン (?token=) のどちらかが必要。
// 家族の予定を URL を知っているだけの部外者から見えなくする。
export async function requireReadAccess(c: Ctx, next: Next) {
  if (hasEditKey(c)) return next()
  const token = c.req.query('token')
  if (token) {
    const row = await c.env.DB.prepare('SELECT token FROM share_tokens WHERE token = ?')
      .bind(token).first()
    if (row) return next()
  }
  return c.json({ error: 'unauthorized' }, 401)
}
