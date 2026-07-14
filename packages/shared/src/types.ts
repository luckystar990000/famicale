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

export interface ChecklistItem {
  name: string
  checked: boolean
}

export interface Schedule {
  id: string
  documentId?: string
  source: ScheduleSource
  status: ScheduleStatus
  title: string
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  visitDate?: string
  visitedDate?: string
  postponedFrom?: string
  category?: string
  tags?: string[]
  notes?: string
  checklist?: ChecklistItem[]
  createdAt: string
  updatedAt: string
}

export interface ExtractedSchedule {
  title: string
  startDate: string
  endDate?: string
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
  sortOrder?: number
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

// 献立表は学校単位 (小学校 / 中学校 等)。 menus は 'YYYY-MM-DD' → 献立テキスト。
export interface LunchTable {
  id: string
  name: string
  menus: Record<string, string>
}
