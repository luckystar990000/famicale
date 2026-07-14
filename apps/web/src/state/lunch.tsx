import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { LunchTable } from '@famicale/shared'
import { uuid } from '../lib/uuid'
import {
  listLunch,
  createLunch as apiCreate,
  updateLunch as apiUpdate,
  removeLunch as apiRemove,
} from '../api/client'

// D1 移行前の localStorage キー。 初回だけ D1 へ移行して消す。
const LEGACY_KEY = 'famicale.lunch.v1'

function loadLegacy(): LunchTable[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as LunchTable[]
      // 初期実装 (単一 map) からの引き継ぎ
      if (parsed && typeof parsed === 'object') {
        return [{ id: uuid(), name: '給食', menus: parsed as Record<string, string> }]
      }
    }
  } catch {
    // ignore
  }
  return []
}

function clearLegacy() {
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
}

interface LunchAPI {
  tables: LunchTable[]
  loading: boolean
  addTable: (name: string) => LunchTable
  renameTable: (id: string, name: string) => void
  removeTable: (id: string) => void
  setMenu: (id: string, date: string, menu: string) => void
}

const Ctx = createContext<LunchAPI | null>(null)

export function LunchProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<LunchTable[]>([])
  const [loading, setLoading] = useState(true)

  const tablesRef = useRef(tables)
  useEffect(() => { tablesRef.current = tables }, [tables])

  // 初回ロード。 D1 が空 かつ localStorage に旧データがあれば D1 へ移行してから使う。
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let loaded = await listLunch()
        if (loaded.length === 0) {
          const legacy = loadLegacy()
          if (legacy.length > 0) {
            for (const t of legacy) {
              try { await apiCreate(t) } catch (e) { console.error('migrate lunch failed', e) }
            }
            loaded = await listLunch()
            clearLegacy()
          }
        }
        if (!cancelled) setTables(loaded)
      } catch (err) {
        console.error('listLunch failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 変更後の完全 LunchTable を PUT。 失敗したら変更前に戻す。
  const persist = useCallback((updated: LunchTable, prev: LunchTable) => {
    apiUpdate(updated).catch(err => {
      console.error('updateLunch failed', err)
      setTables(ts => ts.map(t => t.id === prev.id ? prev : t))
    })
  }, [])

  const addTable = useCallback((name: string): LunchTable => {
    const t: LunchTable = { id: uuid(), name: name.trim(), menus: {} }
    setTables(prev => [...prev, t])
    apiCreate(t).catch(err => {
      console.error('createLunch failed', err)
      setTables(prev => prev.filter(x => x.id !== t.id))
    })
    return t
  }, [])

  const renameTable = useCallback((id: string, name: string) => {
    const current = tablesRef.current.find(t => t.id === id)
    if (!current) return
    const updated: LunchTable = { ...current, name: name.trim() }
    setTables(prev => prev.map(t => t.id === id ? updated : t))
    persist(updated, current)
  }, [persist])

  const removeTable = useCallback((id: string) => {
    const current = tablesRef.current.find(t => t.id === id)
    if (!current) return
    setTables(prev => prev.filter(t => t.id !== id))
    apiRemove(id).catch(err => {
      console.error('removeLunch failed', err)
      setTables(prev => [...prev, current])
    })
  }, [])

  const setMenu = useCallback((id: string, date: string, menu: string) => {
    const current = tablesRef.current.find(t => t.id === id)
    if (!current) return
    const trimmed = menu.trim()
    let menus: Record<string, string>
    if (trimmed) {
      menus = { ...current.menus, [date]: trimmed }
    } else {
      if (!(date in current.menus)) return
      menus = { ...current.menus }
      delete menus[date]
    }
    const updated: LunchTable = { ...current, menus }
    setTables(prev => prev.map(t => t.id === id ? updated : t))
    persist(updated, current)
  }, [persist])

  return (
    <Ctx.Provider value={{ tables, loading, addTable, renameTable, removeTable, setMenu }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLunch(): LunchAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('LunchProvider missing')
  return v
}
