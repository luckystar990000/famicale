import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { uuid } from '../lib/uuid'

const STORAGE_KEY = 'famicale.lunch.v1'

// 献立表は学校単位 (小学校 / 中学校 等)。 menus は 'YYYY-MM-DD' → 献立テキスト。
export interface LunchTable {
  id: string
  name: string
  menus: Record<string, string>
}

function load(): LunchTable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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

function save(tables: LunchTable[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables))
  } catch {
    // ignore
  }
}

interface LunchAPI {
  tables: LunchTable[]
  addTable: (name: string) => LunchTable
  renameTable: (id: string, name: string) => void
  removeTable: (id: string) => void
  setMenu: (id: string, date: string, menu: string) => void
}

const Ctx = createContext<LunchAPI | null>(null)

export function LunchProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<LunchTable[]>(load)

  useEffect(() => { save(tables) }, [tables])

  const addTable = useCallback((name: string): LunchTable => {
    const t: LunchTable = { id: uuid(), name: name.trim(), menus: {} }
    setTables(prev => [...prev, t])
    return t
  }, [])

  const renameTable = useCallback((id: string, name: string) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, name: name.trim() } : t))
  }, [])

  const removeTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id))
  }, [])

  const setMenu = useCallback((id: string, date: string, menu: string) => {
    const trimmed = menu.trim()
    setTables(prev => prev.map(t => {
      if (t.id !== id) return t
      if (trimmed) return { ...t, menus: { ...t.menus, [date]: trimmed } }
      if (!(date in t.menus)) return t
      const menus = { ...t.menus }
      delete menus[date]
      return { ...t, menus }
    }))
  }, [])

  return (
    <Ctx.Provider value={{ tables, addTable, renameTable, removeTable, setMenu }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLunch(): LunchAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('LunchProvider missing')
  return v
}
