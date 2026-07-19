import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Schedule, ChecklistItem } from '@famicale/shared'
import { uuid } from '../lib/uuid'
import {
  listSchedules,
  createSchedule as apiCreateSchedule,
  updateSchedule as apiUpdateSchedule,
  removeSchedule as apiRemoveSchedule,
} from '../api/client'

// 予定本体は D1 が正 (楽観的更新でローカル反映 → 裏で API → 失敗時ロールバック)。
// tagRegistry (未使用タグの記憶) は当面 localStorage 継続。 実データのタグは
// schedules 経由で共有されるので、 registry がローカルでも実害は小さい。
const TAGS_STORAGE_KEY = 'famicale.tags.v1'

function loadTagRegistry(): string[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveTagRegistry(tags: string[]) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
  } catch {
    // ignore
  }
}

// 期間イベントの日付ズラし: startDate を動かしたぶん endDate も同じ日数ずらす。
function shiftEndDate(startDate: string, endDate: string | undefined, newStartDate: string): string | undefined {
  if (!endDate) return endDate
  const oldStart = new Date(`${startDate}T00:00:00`)
  const oldEnd = new Date(`${endDate}T00:00:00`)
  const newStart = new Date(`${newStartDate}T00:00:00`)
  const deltaMs = oldEnd.getTime() - oldStart.getTime()
  const newEnd = new Date(newStart.getTime() + deltaMs)
  return `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')}`
}

export interface ScheduleInput {
  title: string
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  visitDate?: string
  visitedDate?: string
  tags?: string[]
  notes?: string
  checklist?: ChecklistItem[]
  postponedFrom?: string
}

function normalizeChecklist(items?: ChecklistItem[]): ChecklistItem[] | undefined {
  if (!items) return undefined
  const seen = new Set<string>()
  const cleaned = items
    .map(it => ({ name: it.name.trim(), checked: it.checked }))
    .filter(it => {
      if (it.name === '' || seen.has(it.name)) return false
      seen.add(it.name)
      return true
    })
  return cleaned.length > 0 ? cleaned : undefined
}

function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags) return undefined
  const seen = new Set<string>()
  const cleaned = tags.map(t => t.trim()).filter(t => {
    if (t === '' || seen.has(t)) return false
    seen.add(t)
    return true
  })
  return cleaned.length > 0 ? cleaned : undefined
}

interface SchedulesAPI {
  items: Schedule[]
  loading: boolean
  unauthorized: boolean
  byId: (id: string) => Schedule | undefined
  create: (input: ScheduleInput) => Schedule
  bulkCreate: (inputs: ScheduleInput[], source?: 'manual' | 'document') => Schedule[]
  update: (id: string, input: Partial<ScheduleInput>) => void
  remove: (id: string) => void
  setStatus: (id: string, status: 'active' | 'cancelled') => void
  postpone: (id: string, newStartDate: string) => void
  shiftEventPeriod: (id: string, newStartDate: string) => void
  knownTags: string[]
  deleteTag: (name: string) => void
}

const Ctx = createContext<SchedulesAPI | null>(null)

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [tagRegistry, setTagRegistry] = useState<string[]>(loadTagRegistry)

  // 最新 items を deps なしで読むための ref (mutation で変更前 item を掴む → ロールバック用)。
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  useEffect(() => { saveTagRegistry(tagRegistry) }, [tagRegistry])

  const registerTags = useCallback((tags?: string[]) => {
    if (!tags || tags.length === 0) return
    setTagRegistry(prev => {
      const set = new Set(prev)
      let changed = false
      for (const t of tags) {
        if (!set.has(t)) { set.add(t); changed = true }
      }
      return changed ? [...set] : prev
    })
  }, [])

  // 初回ロード: D1 から全予定を取得。 既存タグを registry に seed。
  useEffect(() => {
    let cancelled = false
    listSchedules()
      .then(loaded => {
        if (cancelled) return
        setItems(loaded)
        registerTags(loaded.flatMap(s => s.tags ?? []))
      })
      .catch(err => {
        console.error('listSchedules failed', err)
        // 編集キー未設定 (or 不一致) の端末。 ホームに設定への導線を出す。
        if (!cancelled && String(err).includes('401')) setUnauthorized(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [registerTags])

  // 変更後の完全 item を PUT。 失敗したら変更前 item に戻す。
  const persist = useCallback((updated: Schedule, prev: Schedule) => {
    apiUpdateSchedule(updated).catch(err => {
      console.error('updateSchedule failed', err)
      setItems(items => items.map(s => s.id === prev.id ? prev : s))
    })
  }, [])

  const create = useCallback((input: ScheduleInput): Schedule => {
    const now = new Date().toISOString()
    const tags = normalizeTags(input.tags)
    const schedule: Schedule = {
      id: uuid(),
      source: 'manual',
      status: 'active',
      title: input.title.trim(),
      startDate: input.startDate,
      endDate: input.endDate?.trim() || undefined,
      tags,
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setItems(prev => [...prev, schedule])
    registerTags(tags)
    apiCreateSchedule(schedule).catch(err => {
      console.error('createSchedule failed', err)
      setItems(prev => prev.filter(s => s.id !== schedule.id))
    })
    return schedule
  }, [registerTags])

  const bulkCreate = useCallback((inputs: ScheduleInput[], source: 'manual' | 'document' = 'document'): Schedule[] => {
    const now = new Date().toISOString()
    const created: Schedule[] = inputs.map(input => ({
      id: uuid(),
      source,
      status: 'active',
      title: input.title.trim(),
      startDate: input.startDate,
      endDate: input.endDate?.trim() || undefined,
      tags: normalizeTags(input.tags),
      notes: input.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }))
    setItems(prev => [...prev, ...created])
    registerTags(created.flatMap(s => s.tags ?? []))
    for (const s of created) {
      apiCreateSchedule(s).catch(err => {
        console.error('createSchedule (bulk) failed', err)
        setItems(prev => prev.filter(x => x.id !== s.id))
      })
    }
    return created
  }, [registerTags])

  const update = useCallback((id: string, input: Partial<ScheduleInput>) => {
    const current = itemsRef.current.find(s => s.id === id)
    if (!current) return
    if ('tags' in input) registerTags(normalizeTags(input.tags))
    const updated: Schedule = {
      ...current,
      title: input.title?.trim() ?? current.title,
      startDate: input.startDate ?? current.startDate,
      startTime: 'startTime' in input ? (input.startTime?.trim() || undefined) : current.startTime,
      endDate: 'endDate' in input ? (input.endDate?.trim() || undefined) : current.endDate,
      endTime: 'endTime' in input ? (input.endTime?.trim() || undefined) : current.endTime,
      visitDate: 'visitDate' in input ? (input.visitDate?.trim() || undefined) : current.visitDate,
      visitedDate: 'visitedDate' in input ? (input.visitedDate?.trim() || undefined) : current.visitedDate,
      tags: 'tags' in input ? normalizeTags(input.tags) : current.tags,
      notes: 'notes' in input ? (input.notes?.trim() || undefined) : current.notes,
      checklist: 'checklist' in input ? normalizeChecklist(input.checklist) : current.checklist,
      postponedFrom: 'postponedFrom' in input ? input.postponedFrom : current.postponedFrom,
      updatedAt: new Date().toISOString(),
    }
    setItems(prev => prev.map(s => s.id === id ? updated : s))
    persist(updated, current)
  }, [registerTags, persist])

  const remove = useCallback((id: string) => {
    const current = itemsRef.current.find(s => s.id === id)
    if (!current) return
    setItems(prev => prev.filter(s => s.id !== id))
    apiRemoveSchedule(id).catch(err => {
      console.error('removeSchedule failed', err)
      setItems(prev => [...prev, current])
    })
  }, [])

  const setStatus = useCallback((id: string, status: 'active' | 'cancelled') => {
    const current = itemsRef.current.find(s => s.id === id)
    if (!current) return
    const updated: Schedule = { ...current, status, updatedAt: new Date().toISOString() }
    setItems(prev => prev.map(s => s.id === id ? updated : s))
    persist(updated, current)
  }, [persist])

  const postpone = useCallback((id: string, newDate: string) => {
    const current = itemsRef.current.find(s => s.id === id)
    if (!current) return
    let updated: Schedule
    if (current.visitDate) {
      updated = {
        ...current,
        postponedFrom: current.postponedFrom ?? current.visitDate,
        visitDate: newDate,
        updatedAt: new Date().toISOString(),
      }
    } else {
      updated = {
        ...current,
        postponedFrom: current.postponedFrom ?? current.startDate,
        startDate: newDate,
        endDate: shiftEndDate(current.startDate, current.endDate, newDate),
        updatedAt: new Date().toISOString(),
      }
    }
    setItems(prev => prev.map(s => s.id === id ? updated : s))
    persist(updated, current)
  }, [persist])

  const shiftEventPeriod = useCallback((id: string, newStartDate: string) => {
    const current = itemsRef.current.find(s => s.id === id)
    if (!current) return
    const updated: Schedule = {
      ...current,
      postponedFrom: current.postponedFrom ?? current.startDate,
      startDate: newStartDate,
      endDate: shiftEndDate(current.startDate, current.endDate, newStartDate),
      updatedAt: new Date().toISOString(),
    }
    setItems(prev => prev.map(s => s.id === id ? updated : s))
    persist(updated, current)
  }, [persist])

  const byId = useCallback((id: string) => items.find(s => s.id === id), [items])

  const deleteTag = useCallback((name: string) => {
    setTagRegistry(prev => prev.filter(t => t !== name))
    const now = new Date().toISOString()
    const affected = itemsRef.current.filter(s => s.tags?.includes(name))
    const updates = affected.map(s => {
      const next = s.tags!.filter(t => t !== name)
      return { ...s, tags: next.length > 0 ? next : undefined, updatedAt: now }
    })
    setItems(prev => prev.map(s => updates.find(u => u.id === s.id) ?? s))
    updates.forEach((u, i) => {
      apiUpdateSchedule(u).catch(err => {
        console.error('deleteTag update failed', err)
        setItems(prev => prev.map(s => s.id === u.id ? affected[i] : s))
      })
    })
  }, [])

  const knownTags = useMemo(() => {
    const set = new Set<string>(tagRegistry)
    for (const s of items) {
      if (s.tags) for (const t of s.tags) set.add(t)
    }
    return [...set].sort()
  }, [items, tagRegistry])

  return (
    <Ctx.Provider value={{ items, loading, unauthorized, byId, create, bulkCreate, update, remove, setStatus, postpone, shiftEventPeriod, knownTags, deleteTag }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSchedules(): SchedulesAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('SchedulesProvider missing')
  return v
}
