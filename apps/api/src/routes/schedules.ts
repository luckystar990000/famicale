import { Hono } from 'hono'
import type { Bindings } from '../index'

const schedules = new Hono<{ Bindings: Bindings }>()

type Row = {
  id: string
  document_id: string | null
  source: string
  status: string
  title: string
  start_date: string
  end_date: string | null
  category: string | null
  tags: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function parseTags(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter(t => typeof t === 'string') : undefined
  } catch {
    return undefined
  }
}

function toSchedule(r: Row) {
  return {
    id: r.id,
    documentId: r.document_id ?? undefined,
    source: r.source,
    status: r.status,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date ?? undefined,
    category: r.category ?? undefined,
    tags: parseTags(r.tags),
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

schedules.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM schedules ORDER BY start_date ASC'
  ).all<Row>()
  return c.json(results.map(toSchedule))
})

schedules.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(c.req.param('id')).first<Row>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(toSchedule(row))
})

function serializeTags(tags?: string[] | null): string | null {
  if (!tags || tags.length === 0) return null
  const cleaned = tags.map(t => t.trim()).filter(t => t !== '')
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null
}

schedules.post('/', async (c) => {
  const body = await c.req.json<{
    title?: string
    startDate?: string
    endDate?: string | null
    category?: string | null
    tags?: string[] | null
    notes?: string | null
  }>()

  if (!body.title?.trim() || !body.startDate?.trim()) {
    return c.json({ error: 'title and startDate are required' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO schedules (id, source, status, title, start_date, end_date, category, tags, notes)
     VALUES (?, 'manual', 'active', ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.title.trim(),
    body.startDate,
    body.endDate ?? null,
    body.category ?? null,
    serializeTags(body.tags),
    body.notes ?? null,
  ).run()

  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toSchedule(row) : { id }, 201)
})

schedules.put('/:id', async (c) => {
  const body = await c.req.json<{
    title?: string
    startDate?: string
    endDate?: string | null
    category?: string | null
    tags?: string[] | null
    notes?: string | null
    status?: 'active' | 'cancelled'
  }>()

  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM schedules WHERE id = ?')
    .bind(id).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const tagsValue = 'tags' in body ? serializeTags(body.tags) : null
  const tagsProvided = 'tags' in body

  await c.env.DB.prepare(`
    UPDATE schedules SET
      title = COALESCE(?, title),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      category = COALESCE(?, category),
      tags = CASE WHEN ? = 1 THEN ? ELSE tags END,
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.title ?? null,
    body.startDate ?? null,
    body.endDate ?? null,
    body.category ?? null,
    tagsProvided ? 1 : 0,
    tagsValue,
    body.notes ?? null,
    body.status ?? null,
    id,
  ).run()

  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toSchedule(row) : null)
})

schedules.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM schedules WHERE id = ?')
    .bind(c.req.param('id')).run()
  return c.json({ deleted: true })
})

export default schedules
