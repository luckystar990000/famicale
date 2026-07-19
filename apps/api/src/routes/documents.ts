import { Hono } from 'hono'
import { extractText, getDocumentProxy } from 'unpdf'
import type { Bindings } from '../index'
import { extractSchedules, extractSchedulesFromText } from '../lib/ocr'
import { requireEditKey, requireReadAccess } from '../lib/auth'

// PDF にこれ未満の文字しか無ければスキャン画像 PDF とみなす (テキストレイヤ無し)。
const PDF_MIN_TEXT_CHARS = 20

// スキャン PDF を判別するためのエラーコード。 UploadPage で「写真で取り込んで」 に出し分ける。
export const SCANNED_PDF_ERROR = 'scanned-pdf'

// 画像 / PDF 以外を弾くためのエラーコード。 UploadPage で「対応していない形式」 に出し分ける。
export const UNSUPPORTED_TYPE_ERROR = 'unsupported-type'

// アップロード上限。 これを超えると base64 化のメモリ / vision の 60s タイムアウトに乗りやすい。
const MAX_FILE_BYTES = 10 * 1024 * 1024
export const FILE_TOO_LARGE_ERROR = 'file-too-large'

// 解析中の予期しない失敗。 詳細は console (wrangler tail) に出し、 クライアントにはコードだけ返す。
export const EXTRACT_FAILED_ERROR = 'extract-failed'

const documents = new Hono<{ Bindings: Bindings }>()

documents.get('/', requireReadAccess, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, filename, content_type, status, created_at, updated_at
     FROM documents ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

documents.get('/:id', requireReadAccess, async (c) => {
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).bind(c.req.param('id')).first()
  if (!doc) return c.json({ error: 'Not found' }, 404)
  return c.json(doc)
})

documents.post('/', requireEditKey, async (c) => {
  const formData = await c.req.formData()
  const file: unknown = formData.get('file') ?? formData.get('image')
  if (!(file instanceof File)) return c.json({ error: 'file field required' }, 400)

  const contentType = file.type || 'application/octet-stream'
  const isPdf = contentType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage = contentType.startsWith('image/')
  // 画像 / PDF 以外は OCR に渡せない。 R2 保存も AI 呼び出しもする前に弾く (無駄な Neurons 消費回避)。
  if (!isPdf && !isImage) {
    return c.json({ status: 'error', error: UNSUPPORTED_TYPE_ERROR }, 415)
  }
  if (file.size > MAX_FILE_BYTES) {
    return c.json({ status: 'error', error: FILE_TOO_LARGE_ERROR }, 413)
  }

  const id = crypto.randomUUID()
  const r2Key = `${id}/${file.name}`

  await c.env.BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType }
  })

  await c.env.DB.prepare(
    'INSERT INTO documents (id, r2_key, filename, content_type, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, r2Key, file.name, contentType, 'processing').run()

  try {
    const bytes = await file.arrayBuffer()

    let schedules
    if (isPdf) {
      // PDF はテキストレイヤを抜いてテキストモデルへ (vision より速く正確、 Neurons も節約)。
      const pdf = await getDocumentProxy(new Uint8Array(bytes))
      const { text } = await extractText(pdf, { mergePages: true })
      if (text.trim().length < PDF_MIN_TEXT_CHARS) {
        // 文字が取れない = スキャン画像 PDF。 vision 化は重いので写真取り込みへ誘導。
        await c.env.DB.prepare(
          "UPDATE documents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
        ).bind(id).run()
        return c.json({ id, status: 'error', error: SCANNED_PDF_ERROR }, 422)
      }
      schedules = await extractSchedulesFromText(c.env.AI, text)
    } else {
      schedules = await extractSchedules(c.env.AI, new Uint8Array(bytes), contentType)
    }

    await c.env.DB.prepare(
      "UPDATE documents SET status = 'done', updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run()
    return c.json({ id, status: 'done', schedules }, 201)
  } catch (err) {
    console.error('[documents.post]', id, err)
    await c.env.DB.prepare(
      "UPDATE documents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run()
    return c.json({ id, status: 'error', error: EXTRACT_FAILED_ERROR }, 500)
  }
})

export default documents
