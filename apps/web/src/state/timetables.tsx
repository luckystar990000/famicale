import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Timetable, TimetableCell, ScheduleSource } from '@famicale/shared'
import { uuid } from '../lib/uuid'
import {
  listTimetables,
  createTimetable as apiCreate,
  updateTimetable as apiUpdate,
  removeTimetable as apiRemove,
} from '../api/client'

// D1 移行前の localStorage キー。 初回だけ D1 へ移行して消す。
const LEGACY_KEY = 'famicale.timetables.v1'

function loadLegacy(): Timetable[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Timetable[]
    }
  } catch {
    // ignore
  }
  return []
}

function clearLegacy() {
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
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
  loading: boolean
  byId: (id: string) => Timetable | undefined
  byOwner: (owner: string) => Timetable[]
  create: (input: TimetableInput, source?: ScheduleSource) => Timetable
  update: (id: string, input: Partial<TimetableInput>) => void
  setCell: (id: string, cell: TimetableCell) => void
  clearCell: (id: string, dayOfWeek: TimetableCell['dayOfWeek'], period: number) => void
  remove: (id: string) => void
  move: (id: string, dir: -1 | 1) => void
  knownSubjects: string[]
}

const Ctx = createContext<TimetablesAPI | null>(null)

export function TimetablesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Timetable[]>([])
  const [loading, setLoading] = useState(true)

  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  // 初回ロード。 D1 が空 かつ localStorage に旧データがあれば D1 へ移行してから使う。
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let loaded = await listTimetables()
        if (loaded.length === 0) {
          const legacy = loadLegacy()
          if (legacy.length > 0) {
            for (let i = 0; i < legacy.length; i++) {
              try {
                await apiCreate({ ...legacy[i], sortOrder: i })
              } catch (e) {
                console.error('migrate timetable failed', e)
              }
            }
            loaded = await listTimetables()
            clearLegacy()
          }
        }
        if (!cancelled) setItems(loaded)
      } catch (err) {
        console.error('listTimetables failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 変更後の完全 Timetable を PUT。 失敗したら変更前に戻す。
  const persist = useCallback((updated: Timetable, prev: Timetable) => {
    apiUpdate(updated).catch(err => {
      console.error('updateTimetable failed', err)
      setItems(items => items.map(t => t.id === prev.id ? prev : t))
    })
  }, [])

  const create = useCallback((input: TimetableInput, source: ScheduleSource = 'manual'): Timetable => {
    const now = new Date().toISOString()
    const maxOrder = itemsRef.current.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), -1)
    const t: Timetable = {
      id: uuid(),
      owner: input.owner.trim(),
      cells: normalizeCells(input.cells),
      validFrom: input.validFrom,
      validTo: input.validTo,
      sortOrder: maxOrder + 1,
      source,
      createdAt: now,
      updatedAt: now,
    }
    setItems(prev => [...prev, t])
    apiCreate(t).catch(err => {
      console.error('createTimetable failed', err)
      setItems(prev => prev.filter(x => x.id !== t.id))
    })
    return t
  }, [])

  const update = useCallback((id: string, input: Partial<TimetableInput>) => {
    const current = itemsRef.current.find(t => t.id === id)
    if (!current) return
    const updated: Timetable = {
      ...current,
      owner: input.owner !== undefined ? input.owner.trim() : current.owner,
      cells: input.cells !== undefined ? normalizeCells(input.cells) : current.cells,
      validFrom: 'validFrom' in input ? input.validFrom : current.validFrom,
      validTo: 'validTo' in input ? input.validTo : current.validTo,
      updatedAt: new Date().toISOString(),
    }
    setItems(prev => prev.map(t => t.id === id ? updated : t))
    persist(updated, current)
  }, [persist])

  const setCell = useCallback((id: string, cell: TimetableCell) => {
    const current = itemsRef.current.find(t => t.id === id)
    if (!current) return
    const subject = cell.subject.trim()
    const others = current.cells.filter(c => !(c.dayOfWeek === cell.dayOfWeek && c.period === cell.period))
    const cells = subject
      ? [...others, { dayOfWeek: cell.dayOfWeek, period: cell.period, subject }]
      : others
    const updated: Timetable = { ...current, cells, updatedAt: new Date().toISOString() }
    setItems(prev => prev.map(t => t.id === id ? updated : t))
    persist(updated, current)
  }, [persist])

  const clearCell = useCallback((id: string, dayOfWeek: TimetableCell['dayOfWeek'], period: number) => {
    const current = itemsRef.current.find(t => t.id === id)
    if (!current) return
    const cells = current.cells.filter(c => !(c.dayOfWeek === dayOfWeek && c.period === period))
    const updated: Timetable = { ...current, cells, updatedAt: new Date().toISOString() }
    setItems(prev => prev.map(t => t.id === id ? updated : t))
    persist(updated, current)
  }, [persist])

  const remove = useCallback((id: string) => {
    const current = itemsRef.current.find(t => t.id === id)
    if (!current) return
    setItems(prev => prev.filter(t => t.id !== id))
    apiRemove(id).catch(err => {
      console.error('removeTimetable failed', err)
      setItems(prev => [...prev, current])
    })
  }, [])

  // 並べ替え: 隣と sortOrder を入れ替えて両者を PUT。
  const move = useCallback((id: string, dir: -1 | 1) => {
    const cur = itemsRef.current
    const idx = cur.findIndex(t => t.id === id)
    if (idx < 0) return
    const to = idx + dir
    if (to < 0 || to >= cur.length) return
    const a = cur[idx]
    const b = cur[to]
    const now = new Date().toISOString()
    const updatedA: Timetable = { ...a, sortOrder: b.sortOrder ?? to, updatedAt: now }
    const updatedB: Timetable = { ...b, sortOrder: a.sortOrder ?? idx, updatedAt: now }
    setItems(prev => prev
      .map(t => t.id === a.id ? updatedA : t.id === b.id ? updatedB : t)
      .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0)))
    apiUpdate(updatedA).catch(err => {
      console.error('move (PUT a) failed', err)
      setItems(prev => prev.map(t => t.id === a.id ? a : t))
    })
    apiUpdate(updatedB).catch(err => {
      console.error('move (PUT b) failed', err)
      setItems(prev => prev.map(t => t.id === b.id ? b : t))
    })
  }, [])

  const byId = useCallback((id: string) => items.find(t => t.id === id), [items])
  const byOwner = useCallback((owner: string) => items.filter(t => t.owner === owner), [items])

  const knownSubjects = useMemo(() => {
    const set = new Set<string>()
    for (const t of items) for (const c of t.cells) set.add(c.subject)
    return [...set].sort()
  }, [items])

  return (
    <Ctx.Provider value={{ items, loading, byId, byOwner, create, update, setCell, clearCell, remove, move, knownSubjects }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTimetables(): TimetablesAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('TimetablesProvider missing')
  return v
}
