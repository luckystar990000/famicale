import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Schedule } from '@famicale/shared'

const STORAGE_KEY = 'famicale.schedules.v1'
const TAGS_STORAGE_KEY = 'famicale.tags.v1'

function uuid(): string {
  // crypto.randomUUID() は secure context (HTTPS / localhost) でしか動かない
  // LAN IP 経由の HTTP アクセスでは例外になるのでフォールバックを用意
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID() } catch { /* fall through */ }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

function shift(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultSchedules(): Schedule[] {
  const now = new Date().toISOString()
  const make = (id: string, title: string, startOffset: number, endOffset?: number, tags?: string[]): Schedule => ({
    id, source: 'manual', status: 'active', title,
    startDate: shift(startOffset),
    endDate: endOffset !== undefined ? shift(endOffset) : undefined,
    tags,
    createdAt: now, updatedAt: now,
  })
  return [
    make('seed-1', '校外学習', 0, undefined, ['長男']),
    make('seed-2', '運動会', 3, undefined, ['長男']),
    make('seed-3', '恐竜博物館 特別展「化石ハンター」', 9, 74, ['家族']),
    make('seed-4', '期末テスト', 24, 26, ['長男']),
    make('seed-5', '科学館 春のフェア', -4, 2, ['家族']),
    make('seed-6', '授業参観', -12, undefined, ['長女']),
    make('seed-7', '健康診断', 14, undefined, ['次男']),
    make('seed-8', '美術展 特別展示', -8, 1, ['家族']),
    make('seed-9', '水族館 クラゲ展', -5, 15, ['家族']),
    make('seed-10', '動物園 ナイトサファリ', -2, 10, ['家族']),
  ]
}

function load(): Schedule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Schedule[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return defaultSchedules()
}

function save(items: Schedule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

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

export interface ScheduleInput {
  title: string
  startDate: string
  endDate?: string
  tags?: string[]
  notes?: string
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
  byId: (id: string) => Schedule | undefined
  create: (input: ScheduleInput) => Schedule
  bulkCreate: (inputs: ScheduleInput[], source?: 'manual' | 'document') => Schedule[]
  update: (id: string, input: Partial<ScheduleInput>) => void
  remove: (id: string) => void
  setStatus: (id: string, status: 'active' | 'cancelled') => void
  reset: () => void
  knownTags: string[]
  deleteTag: (name: string) => void
}

const Ctx = createContext<SchedulesAPI | null>(null)

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Schedule[]>(load)
  const [tagRegistry, setTagRegistry] = useState<string[]>(loadTagRegistry)

  useEffect(() => { save(items) }, [items])
  useEffect(() => { saveTagRegistry(tagRegistry) }, [tagRegistry])

  // 既存タグを registry に seed (初回マウントのみ)。 旧バージョンからの移行用。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const all = items.flatMap(s => s.tags ?? [])
    if (all.length > 0) {
      setTagRegistry(prev => {
        const set = new Set(prev)
        let changed = false
        for (const t of all) {
          if (!set.has(t)) { set.add(t); changed = true }
        }
        return changed ? [...set] : prev
      })
    }
  }, [])

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
    return created
  }, [registerTags])

  const update = useCallback((id: string, input: Partial<ScheduleInput>) => {
    if ('tags' in input) registerTags(normalizeTags(input.tags))
    setItems(prev => prev.map(s => s.id === id ? {
      ...s,
      title: input.title?.trim() ?? s.title,
      startDate: input.startDate ?? s.startDate,
      endDate: 'endDate' in input ? (input.endDate?.trim() || undefined) : s.endDate,
      tags: 'tags' in input ? normalizeTags(input.tags) : s.tags,
      notes: 'notes' in input ? (input.notes?.trim() || undefined) : s.notes,
      updatedAt: new Date().toISOString(),
    } : s))
  }, [registerTags])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(s => s.id !== id))
  }, [])

  const setStatus = useCallback((id: string, status: 'active' | 'cancelled') => {
    setItems(prev => prev.map(s => s.id === id
      ? { ...s, status, updatedAt: new Date().toISOString() }
      : s))
  }, [])

  const byId = useCallback((id: string) => items.find(s => s.id === id), [items])

  const reset = useCallback(() => {
    setItems(defaultSchedules())
    setTagRegistry([])
  }, [])

  const deleteTag = useCallback((name: string) => {
    setTagRegistry(prev => prev.filter(t => t !== name))
    setItems(prev => prev.map(s => {
      if (!s.tags?.includes(name)) return s
      const next = s.tags.filter(t => t !== name)
      return { ...s, tags: next.length > 0 ? next : undefined, updatedAt: new Date().toISOString() }
    }))
  }, [])

  const knownTags = useMemo(() => {
    const set = new Set<string>(tagRegistry)
    for (const s of items) {
      if (s.tags) for (const t of s.tags) set.add(t)
    }
    return [...set].sort()
  }, [items, tagRegistry])

  return (
    <Ctx.Provider value={{ items, byId, create, bulkCreate, update, remove, setStatus, reset, knownTags, deleteTag }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSchedules(): SchedulesAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('SchedulesProvider missing')
  return v
}
