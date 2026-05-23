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

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6  // 1=月 ... 6=土

export interface TimetableCell {
  dayOfWeek: DayOfWeek
  period: number
  subject: string
}

export interface Timetable {
  id: string
  owner: string
  cells: TimetableCell[]
  validFrom?: string
  validTo?: string
  source: ScheduleSource
  createdAt: string
  updatedAt: string
}

export interface ExtractedTimetable {
  owner?: string
  cells: TimetableCell[]
  validFrom?: string
  validTo?: string
}
