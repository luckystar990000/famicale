import type { Schedule, ExtractedSchedule } from '@famicale/shared'
import { mockExtractSchedules } from '../lib/mock-ocr'
import { getEditKey } from '../lib/edit-key'

// dev は Vite proxy 経由の同一オリジン `/api`。 本番は web(Pages) と api(Workers) が
// 別ドメインなので、 ビルド時に VITE_API_BASE=https://<worker>/api を注入して絶対 URL で叩く。
const BASE = import.meta.env.VITE_API_BASE ?? '/api'

// OCR を mock で動かすか実 API で叩くかの切替。 開発中に毎回 Workers AI (Neurons) を
// 消費しないため。 本番ビルドでは import.meta.env.DEV が false なので常に実 API。
const OCR_MOCK_KEY = 'famicale_ocr_mock'

export function isOcrMock(): boolean {
  return import.meta.env.DEV && localStorage.getItem(OCR_MOCK_KEY) === '1'
}

export function setOcrMock(on: boolean): void {
  localStorage.setItem(OCR_MOCK_KEY, on ? '1' : '0')
}

// 書き込みリクエストに編集キーを載せる。 未設定なら付けない (サーバが 401 を返す)。
function editKeyHeader(): Record<string, string> {
  const key = getEditKey()
  return key ? { 'X-Edit-Key': key } : {}
}

// --- schedules CRUD ---
// PUT は全置換契約。 create/update とも「完全な Schedule オブジェクト」を送る
// (id は web 側で生成。 サーバは受け取った id をそのまま使う → 楽観的更新が成立する)。
// GET は認証不要 (閲覧公開)、 書き込みは編集キーが要る。

export async function listSchedules(): Promise<Schedule[]> {
  const res = await fetch(`${BASE}/schedules`)
  if (!res.ok) throw new Error(`GET /schedules failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createSchedule(schedule: Schedule): Promise<Schedule> {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...editKeyHeader() },
    body: JSON.stringify(schedule),
  })
  if (!res.ok) throw new Error(`POST /schedules failed: ${res.status}`)
  return res.json()
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule> {
  const res = await fetch(`${BASE}/schedules/${schedule.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...editKeyHeader() },
    body: JSON.stringify(schedule),
  })
  if (!res.ok) throw new Error(`PUT /schedules/${schedule.id} failed: ${res.status}`)
  return res.json()
}

export async function removeSchedule(id: string): Promise<void> {
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'DELETE',
    headers: editKeyHeader(),
  })
  if (!res.ok) throw new Error(`DELETE /schedules/${id} failed: ${res.status}`)
}

// --- OCR (documents) ---

export interface UploadDocumentResult {
  id: string
  status: 'done' | 'error'
  schedules?: ExtractedSchedule[]
  error?: string
}

export async function uploadDocument(file: File): Promise<UploadDocumentResult> {
  if (isOcrMock()) {
    const schedules = await mockExtractSchedules(file)
    return { id: 'mock', status: 'done', schedules }
  }
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/documents`, {
    method: 'POST',
    headers: editKeyHeader(),
    body: formData,
  })
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`)
  return res.json()
}
