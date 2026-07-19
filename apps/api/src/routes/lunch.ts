import { Hono } from 'hono'
import type { Bindings } from '../index'
import { requireEditKey, requireReadAccess } from '../lib/auth'

const lunch = new Hono<{ Bindings: Bindings }>()

type Row = {
  id: string
  name: string
  menus: string
  created_at: string
  updated_at: string
}

function parseMenus(raw: string): Record<string, string> {
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, string> = {}
      for (const [k, val] of Object.entries(v)) {
        if (typeof val === 'string') out[k] = val
      }
      return out
    }
  } catch {
    // ignore
  }
  return {}
}

function serializeMenus(menus?: Record<string, string> | null): string {
  if (!menus) return '{}'
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(menus)) {
    if (typeof v === 'string' && v.trim() !== '') out[k] = v.trim()
  }
  return JSON.stringify(out)
}

function toLunch(r: Row) {
  return {
    id: r.id,
    name: r.name,
    menus: parseMenus(r.menus),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

type LunchBody = {
  id?: string
  name?: string
  menus?: Record<string, string> | null
}

lunch.get('/', requireReadAccess, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM lunch_tables ORDER BY created_at ASC'
  ).all<Row>()
  return c.json(results.map(toLunch))
})

lunch.post('/', requireEditKey, async (c) => {
  const body = await c.req.json<LunchBody>()
  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }
  const id = body.id?.trim() || crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO lunch_tables (id, name, menus) VALUES (?, ?, ?)'
  ).bind(id, body.name.trim(), serializeMenus(body.menus)).run()
  const row = await c.env.DB.prepare('SELECT * FROM lunch_tables WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toLunch(row) : { id }, 201)
})

// 全置換方式。 web は完全な LunchTable (menus 全体) を送る。
lunch.put('/:id', requireEditKey, async (c) => {
  const body = await c.req.json<LunchBody>()
  const id = c.req.param('id')
  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400)
  }
  const existing = await c.env.DB.prepare('SELECT id FROM lunch_tables WHERE id = ?')
    .bind(id).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(
    "UPDATE lunch_tables SET name = ?, menus = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(body.name.trim(), serializeMenus(body.menus), id).run()
  const row = await c.env.DB.prepare('SELECT * FROM lunch_tables WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toLunch(row) : null)
})

lunch.delete('/:id', requireEditKey, async (c) => {
  await c.env.DB.prepare('DELETE FROM lunch_tables WHERE id = ?')
    .bind(c.req.param('id')).run()
  return c.json({ deleted: true })
})

export default lunch
