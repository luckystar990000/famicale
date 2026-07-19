import { Hono } from 'hono'
import type { ChecklistItem } from '@famicale/shared'
import type { Bindings } from '../index'
import { requireEditKey, requireReadAccess } from '../lib/auth'

const schedules = new Hono<{ Bindings: Bindings }>()

type Row = {
  id: string
  document_id: string | null
  source: string
  status: string
  title: string
  start_date: string
  start_time: string | null
  end_date: string | null
  end_time: string | null
  visit_date: string | null
  visited_date: string | null
  postponed_from: string | null
  category: string | null
  tags: string | null
  notes: string | null
  checklist: string | null
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

function serializeTags(tags?: string[] | null): string | null {
  if (!tags || tags.length === 0) return null
  const cleaned = tags.map(t => t.trim()).filter(t => t !== '')
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null
}

function parseChecklist(raw: string | null): ChecklistItem[] | undefined {
  if (!raw) return undefined
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return undefined
    const items = v
      .filter(x => x && typeof x.name === 'string')
      .map(x => ({ name: x.name as string, checked: !!x.checked }))
    return items.length > 0 ? items : undefined
  } catch {
    return undefined
  }
}

function serializeChecklist(items?: ChecklistItem[] | null): string | null {
  if (!items || items.length === 0) return null
  const cleaned = items
    .filter(i => i && typeof i.name === 'string' && i.name.trim() !== '')
    .map(i => ({ name: i.name.trim(), checked: !!i.checked }))
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null
}

function toSchedule(r: Row) {
  return {
    id: r.id,
    documentId: r.document_id ?? undefined,
    source: r.source,
    status: r.status,
    title: r.title,
    startDate: r.start_date,
    startTime: r.start_time ?? undefined,
    endDate: r.end_date ?? undefined,
    endTime: r.end_time ?? undefined,
    visitDate: r.visit_date ?? undefined,
    visitedDate: r.visited_date ?? undefined,
    postponedFrom: r.postponed_from ?? undefined,
    category: r.category ?? undefined,
    tags: parseTags(r.tags),
    notes: r.notes ?? undefined,
    checklist: parseChecklist(r.checklist),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

type ScheduleBody = {
  id?: string
  documentId?: string | null
  source?: 'manual' | 'document'
  status?: 'active' | 'cancelled'
  title?: string
  startDate?: string
  startTime?: string | null
  endDate?: string | null
  endTime?: string | null
  visitDate?: string | null
  visitedDate?: string | null
  postponedFrom?: string | null
  category?: string | null
  tags?: string[] | null
  notes?: string | null
  checklist?: ChecklistItem[] | null
}

schedules.get('/', requireReadAccess, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM schedules ORDER BY start_date ASC'
  ).all<Row>()
  return c.json(results.map(toSchedule))
})

schedules.get('/:id', requireReadAccess, async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(c.req.param('id')).first<Row>()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(toSchedule(row))
})

schedules.post('/', requireEditKey, async (c) => {
  const body = await c.req.json<ScheduleBody>()

  if (!body.title?.trim() || !body.startDate?.trim()) {
    return c.json({ error: 'title and startDate are required' }, 400)
  }

  // id は web 側で生成して送れる (楽観的更新のため)。 未指定ならサーバ生成。
  const id = body.id?.trim() || crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO schedules
       (id, document_id, source, status, title, start_date, start_time,
        end_date, end_time, visit_date, visited_date, postponed_from,
        category, tags, notes, checklist)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.documentId ?? null,
    body.source ?? 'manual',
    body.status ?? 'active',
    body.title.trim(),
    body.startDate,
    body.startTime ?? null,
    body.endDate ?? null,
    body.endTime ?? null,
    body.visitDate ?? null,
    body.visitedDate ?? null,
    body.postponedFrom ?? null,
    body.category ?? null,
    serializeTags(body.tags),
    body.notes ?? null,
    serializeChecklist(body.checklist),
  ).run()

  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toSchedule(row) : { id }, 201)
})

// 全置換方式: 送られた完全オブジェクトで全カラムを上書きする。
// 未指定フィールドは null にクリアされる (COALESCE 方式では null クリアできない地雷を回避)。
// → web 側は「現在の Schedule 全体をベースに変更を当てた完全オブジェクト」を送る契約。
schedules.put('/:id', requireEditKey, async (c) => {
  const body = await c.req.json<ScheduleBody>()
  const id = c.req.param('id')

  if (!body.title?.trim() || !body.startDate?.trim()) {
    return c.json({ error: 'title and startDate are required' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM schedules WHERE id = ?')
    .bind(id).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare(`
    UPDATE schedules SET
      title = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?,
      visit_date = ?, visited_date = ?, postponed_from = ?, category = ?,
      tags = ?, notes = ?, checklist = ?, status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.title.trim(),
    body.startDate,
    body.startTime ?? null,
    body.endDate ?? null,
    body.endTime ?? null,
    body.visitDate ?? null,
    body.visitedDate ?? null,
    body.postponedFrom ?? null,
    body.category ?? null,
    serializeTags(body.tags),
    body.notes ?? null,
    serializeChecklist(body.checklist),
    body.status ?? 'active',
    id,
  ).run()

  const row = await c.env.DB.prepare('SELECT * FROM schedules WHERE id = ?')
    .bind(id).first<Row>()
  return c.json(row ? toSchedule(row) : null)
})

schedules.delete('/:id', requireEditKey, async (c) => {
  await c.env.DB.prepare('DELETE FROM schedules WHERE id = ?')
    .bind(c.req.param('id')).run()
  return c.json({ deleted: true })
})

export default schedules
