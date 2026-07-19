import { Hono } from 'hono'
import type { TimetableCell } from '@famicale/shared'
import type { Bindings } from '../index'
import { requireEditKey, requireReadAccess } from '../lib/auth'

const timetables = new Hono<{ Bindings: Bindings }>()

type Row = {
  id: string
  owner: string
  cells: string
  valid_from: string | null
  valid_to: string | null
  sort_order: number
  source: string
  created_at: string
  updated_at: string
}

function parseCells(raw: string): TimetableCell[] {
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v
      .filter(c => c && typeof c.subject === 'string' && typeof c.dayOfWeek === 'number' && typeof c.period === 'number')
      .map(c => ({ dayOfWeek: c.dayOfWeek, period: c.period, subject: c.subject }))
  } catch {
    return []
  }
}

function serializeCells(cells?: TimetableCell[] | null): string {
  if (!cells || cells.length === 0) return '[]'
  const cleaned = cells
    .filter(c => c && typeof c.subject === 'string' && c.subject.trim() !== '')
    .map(c => ({ dayOfWeek: c.dayOfWeek, period: c.period, subject: c.subject.trim() }))
  return JSON.stringify(cleaned)
}

function toTimetable(r: Row) {
  return {
    id: r.id,
    owner: r.owner,
    cells: parseCells(r.cells),
    validFrom: r.valid_from ?? undefined,
    validTo: r.valid_to ?? undefined,
    sortOrder: r.sort_order,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

type TimetableBody = {
  id?: string
  owner?: string
  cells?: TimetableCell[] | null
  validFrom?: string | null
  validTo?: string | null
  sortOrder?: number | null
  source?: 'manual' | 'document'
}

timetables.get('/', requireReadAccess, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM timetables ORDER BY sort_order ASC, created_at ASC'
  ).all<Row>()
  return c.json(results.map(toTimetable))
})

timetables.get('/:id', requireReadAccess, async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM timetables WHERE id = ?')
    .bind(c.req.param('id')).first<Row>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(toTimetable(row))
})

timetables.post('/', requireEditKey, async (c) => {
  const body = await c.req.json<TimetableBody>()
  if (!body.owner?.trim()) {
    return c.json({ error: 'owner is required' }, 400)
  }
  const id = body.id?.trim() || crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO timetables (id, owner, cells, valid_from, valid_to, sort_order, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.owner.trim(),
    serializeCells(body.cells),
    body.validFrom ?? null,
    body.validTo ?? null,
    body.sortOrder ?? 0,
    body.source ?? 'manual',
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM timetables WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toTimetable(row) : { id }, 201)
})

// 全置換方式 (schedules と同じ契約: web は完全な Timetable を送る)。
timetables.put('/:id', requireEditKey, async (c) => {
  const body = await c.req.json<TimetableBody>()
  const id = c.req.param('id')
  if (!body.owner?.trim()) {
    return c.json({ error: 'owner is required' }, 400)
  }
  const existing = await c.env.DB.prepare('SELECT id FROM timetables WHERE id = ?')
    .bind(id).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(`
    UPDATE timetables SET
      owner = ?, cells = ?, valid_from = ?, valid_to = ?, sort_order = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.owner.trim(),
    serializeCells(body.cells),
    body.validFrom ?? null,
    body.validTo ?? null,
    body.sortOrder ?? 0,
    id,
  ).run()
  const row = await c.env.DB.prepare('SELECT * FROM timetables WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toTimetable(row) : null)
})

timetables.delete('/:id', requireEditKey, async (c) => {
  await c.env.DB.prepare('DELETE FROM timetables WHERE id = ?')
    .bind(c.req.param('id')).run()
  return c.json({ deleted: true })
})

export default timetables
