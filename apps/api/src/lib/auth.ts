import type { Context, Next } from 'hono'
import type { Bindings } from '../index'

// 書き込み系 API を編集キーで保護する。 X-Edit-Key ヘッダを Worker secret EDIT_KEY と照合。
// 夫婦 2 人が同じキーを共有して書き込む方式 (誰が編集したかは記録しない)。 閲覧 (GET) はキー不要。
export async function requireEditKey(c: Context<{ Bindings: Bindings }>, next: Next) {
  const key = c.req.header('X-Edit-Key')
  if (!key || key !== c.env.EDIT_KEY) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  await next()
}
