import type { Schedule, ExtractedSchedule } from '@famicale/shared'

const BASE = '/api'

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
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/documents`, { method: 'POST', body: formData })
  return res.json()
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`)
  return res.json()
}
