import { Hono } from 'hono'
import type { Bindings } from '../index'
import { extractSchedules } from '../lib/ocr'

const documents = new Hono<{ Bindings: Bindings }>()

documents.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, filename, content_type, status, created_at, updated_at
     FROM documents ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

documents.get('/:id', async (c) => {
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).bind(c.req.param('id')).first()
  if (!doc) return c.json({ error: 'Not found' }, 404)
  return c.json(doc)
})

documents.post('/', async (c) => {
  const formData = await c.req.formData()
  const file = (formData.get('file') ?? formData.get('image')) as File | null
  if (!file) return c.json({ error: 'file field required' }, 400)

  const id = crypto.randomUUID()
  const r2Key = `${id}/${file.name}`
  const contentType = file.type || 'application/octet-stream'

  await c.env.BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType }
  })

  await c.env.DB.prepare(
    'INSERT INTO documents (id, r2_key, filename, content_type, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, r2Key, file.name, contentType, 'processing').run()

  c.executionCtx.waitUntil(processDocument(c.env, id, file, contentType))

  return c.json({ id, status: 'processing' }, 201)
})

async function processDocument(env: Bindings, docId: string, file: File, contentType: string) {
  try {
    const bytes = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))

    const extracted = await extractSchedules(env.ANTHROPIC_API_KEY, base64, contentType)

    for (const s of extracted) {
      await env.DB.prepare(
        `INSERT INTO schedules (id, document_id, source, title, start_date, end_date, category)
         VALUES (?, ?, 'document', ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        docId,
        s.title,
        s.startDate,
        s.endDate ?? null,
        s.category ?? null,
      ).run()
    }

    await env.DB.prepare(
      "UPDATE documents SET status = 'done', updated_at = datetime('now') WHERE id = ?"
    ).bind(docId).run()
  } catch {
    await env.DB.prepare(
      "UPDATE documents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
    ).bind(docId).run()
  }
}

export default documents
