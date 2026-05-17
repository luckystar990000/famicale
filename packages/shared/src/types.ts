export type DocumentStatus = 'pending' | 'processing' | 'done' | 'error'
export type ScheduleSource = 'document' | 'manual'
export type ScheduleStatus = 'active' | 'cancelled'

export interface Document {
  id: string
  r2Key: string
  filename: string
  contentType: string
  status: DocumentStatus
  rawText?: string
  createdAt: string
  updatedAt: string
}

export interface Schedule {
  id: string
  documentId?: string
  source: ScheduleSource
  status: ScheduleStatus
  title: string
  startDate: string
  endDate?: string
  category?: string
  tags?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ExtractedSchedule {
  title: string
  startDate: string
  endDate?: string
  category?: string
}
