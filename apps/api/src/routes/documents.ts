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

  try {
    const bytes = await file.arrayBuffer()
    const schedules = await extractSchedules(c.env.AI, new Uint8Array(bytes), contentType)
    await c.env.DB.prepare(
      "UPDATE documents SET status = 'done', updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run()
    return c.json({ id, status: 'done', schedules }, 201)
  } catch (err) {
    console.error('[documents.post]', id, err)
    await c.env.DB.prepare(
      "UPDATE documents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run()
    return c.json({ id, status: 'error', error: String(err) }, 500)
  }
})

export default documents
