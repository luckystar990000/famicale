import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Timetable, TimetableCell, ScheduleSource } from '@famicale/shared'

const STORAGE_KEY = 'famicale.timetables.v1'

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID() } catch { /* fall through */ }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

function load(): Timetable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Timetable[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function save(items: Timetable[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export interface TimetableInput {
  owner: string
  cells: TimetableCell[]
  validFrom?: string
  validTo?: string
}

function normalizeCells(cells: TimetableCell[]): TimetableCell[] {
  const seen = new Set<string>()
  const out: TimetableCell[] = []
  for (const c of cells) {
    const subject = c.subject.trim()
    if (!subject) continue
    const key = `${c.dayOfWeek}-${c.period}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ dayOfWeek: c.dayOfWeek, period: c.period, subject })
  }
  return out
}

interface TimetablesAPI {
  items: Timetable[]
  byId: (id: string) => Timetable | undefined
  byOwner: (owner: string) => Timetable[]
  create: (input: TimetableInput, source?: ScheduleSource) => Timetable
  update: (id: string, input: Partial<TimetableInput>) => void
  setCell: (id: string, cell: TimetableCell) => void
  clearCell: (id: string, dayOfWeek: TimetableCell['dayOfWeek'], period: number) => void
  remove: (id: string) => void
  reset: () => void
}

const Ctx = createContext<TimetablesAPI | null>(null)

export function TimetablesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Timetable[]>(load)

  useEffect(() => { save(items) }, [items])

  const create = useCallback((input: TimetableInput, source: ScheduleSource = 'manual'): Timetable => {
    const now = new Date().toISOString()
    const t: Timetable = {
      id: uuid(),
      owner: input.owner.trim(),
      cells: normalizeCells(input.cells),
      validFrom: input.validFrom,
      validTo: input.validTo,
      source,
      createdAt: now,
      updatedAt: now,
    }
    setItems(prev => [...prev, t])
    return t
  }, [])

  const update = useCallback((id: string, input: Partial<TimetableInput>) => {
    setItems(prev => prev.map(t => t.id === id ? {
      ...t,
      owner: input.owner !== undefined ? input.owner.trim() : t.owner,
      cells: input.cells !== undefined ? normalizeCells(input.cells) : t.cells,
      validFrom: 'validFrom' in input ? input.validFrom : t.validFrom,
      validTo: 'validTo' in input ? input.validTo : t.validTo,
      updatedAt: new Date().toISOString(),
    } : t))
  }, [])

  const setCell = useCallback((id: string, cell: TimetableCell) => {
    const subject = cell.subject.trim()
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t
      const others = t.cells.filter(c => !(c.dayOfWeek === cell.dayOfWeek && c.period === cell.period))
      const next = subject
        ? [...others, { dayOfWeek: cell.dayOfWeek, period: cell.period, subject }]
        : others
      return { ...t, cells: next, updatedAt: new Date().toISOString() }
    }))
  }, [])

  const clearCell = useCallback((id: string, dayOfWeek: TimetableCell['dayOfWeek'], period: number) => {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t
      const next = t.cells.filter(c => !(c.dayOfWeek === dayOfWeek && c.period === period))
      return { ...t, cells: next, updatedAt: new Date().toISOString() }
    }))
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const reset = useCallback(() => {
    setItems([])
  }, [])

  const byId = useCallback((id: string) => items.find(t => t.id === id), [items])
  const byOwner = useCallback((owner: string) => items.filter(t => t.owner === owner), [items])

  return (
    <Ctx.Provider value={{ items, byId, byOwner, create, update, setCell, clearCell, remove, reset }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTimetables(): TimetablesAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('TimetablesProvider missing')
  return v
}
