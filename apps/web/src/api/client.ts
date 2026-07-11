import type { Schedule, ExtractedSchedule } from '@famicale/shared'
import { mockExtractSchedules } from '../lib/mock-ocr'

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

export async function getSchedules(): Promise<Schedule[]> {
  const res = await fetch(`${BASE}/schedules`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createSchedule(data: {
  title: string
  startDate: string
  endDate?: string | null
  category?: string | null
  notes?: string | null
}): Promise<Schedule> {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function updateSchedule(id: string, data: {
  title?: string
  startDate?: string
  endDate?: string | null
  category?: string | null
  notes?: string | null
}): Promise<Schedule> {
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteSchedule(id: string) {
  const res = await fetch(`${BASE}/schedules/${id}`, { method: 'DELETE' })
  return res.json()
}

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
  const res = await fetch(`${BASE}/documents`, { method: 'POST', body: formData })
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`)
  return res.json()
}
