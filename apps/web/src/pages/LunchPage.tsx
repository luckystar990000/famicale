import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import NavBar from '../components/NavBar'
import Sheet from '../components/Sheet'
import AlertDialog from '../components/AlertDialog'
import Chip from '../components/Chip'
import { ListSection, ListRow } from '../components/List'
import { useLunch } from '../state/lunch'

export default function LunchPage() {
  const { tables, addTable, renameTable, removeTable, setMenu } = useLunch()
  const now = new Date()
  const todayISO = toISO(now)
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [selectedId, setSelectedId] = useState<string | null>(tables[0]?.id ?? null)
  const [nameSheet, setNameSheet] = useState<'add' | 'manage' | null>(null)
  const [draftName, setDraftName] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const selected = tables.find(t => t.id === selectedId) ?? tables[0]
  const days = weekdaysOfMonth(month.y, month.m)

  function moveMonth(delta: number) {
    setMonth(({ y, m }) => {
      const d = new Date(y, m - 1 + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
  }

  function openAdd() {
    setDraftName('')
    setNameSheet('add')
  }

  function openManage(id: string) {
    const t = tables.find(t => t.id === id)
    if (!t) return
    setSelectedId(id)
    setDraftName(t.name)
    setNameSheet('manage')
  }

  function commitName() {
    const name = draftName.trim()
    if (!name) return
    if (nameSheet === 'add') {
      const t = addTable(name)
      setSelectedId(t.id)
    } else if (nameSheet === 'manage' && selected) {
      renameTable(selected.id, name)
    }
    setNameSheet(null)
  }

  function confirmDelete() {
    if (!selected) return
    removeTable(selected.id)
    setSelectedId(tables.find(t => t.id !== selected.id)?.id ?? null)
    setDeleteOpen(false)
    setNameSheet(null)
  }

  return (
    <>
      <NavBar
        title="給食の献立"
        back={{ to: '/' }}
        rightAction={selected ? { label: '編集', onClick: () => openManage(selected.id) } : undefined}
      />

      <div style={{ paddingTop: 8 }}>
        {tables.length === 0 ? (
          <div style={{ paddingTop: 8 }}>
            <ListSection footer="学校ごとに献立表を分けられます (例: 小学校 / 中学校)。">
              <ListRow onClick={openAdd}>
                <span style={{ color: 'var(--tint)', fontWeight: 500 }}>
                  + 献立表を追加
                </span>
              </ListRow>
            </ListSection>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '4px 16px 12px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}>
              {tables.map(t => (
                <Chip
                  key={t.id}
                  label={t.name}
                  active={t.id === selected?.id}
                  onClick={() => setSelectedId(t.id)}
                  onLongPress={() => openManage(t.id)}
                />
              ))}
              <Chip label="+ 追加" active={false} onClick={openAdd} />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
              marginBottom: 8,
            }}>
              <MonthButton onClick={() => moveMonth(-1)} label="前の月">
                <ChevronLeft size={22} strokeWidth={2.2} color="var(--tint)" />
              </MonthButton>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--label)' }}>
                {month.y}年{month.m}月
              </span>
              <MonthButton onClick={() => moveMonth(1)} label="次の月">
                <ChevronRight size={22} strokeWidth={2.2} color="var(--tint)" />
              </MonthButton>
            </div>

            {selected && (
              <ListSection footer="献立表のとおりに入力します。空にすると消えます。">
                {days.map(date => {
                  const menu = selected.menus[date] ?? ''
                  const isPast = date < todayISO
                  const isToday = date === todayISO
                  return (
                    <ListRow key={date}>
                      <span style={{
                        flexShrink: 0,
                        width: 74,
                        fontSize: 15,
                        fontWeight: isToday ? 600 : 400,
                        color: isToday ? 'var(--tint)' : isPast ? 'var(--label-tertiary)' : 'var(--label-secondary)',
                      }}>
                        {formatDayLabel(date)}
                      </span>
                      <input
                        key={`${selected.id}-${date}-${menu}`}
                        type="text"
                        defaultValue={menu}
                        placeholder="未入力"
                        onBlur={e => {
                          if (e.target.value.trim() !== menu) setMenu(selected.id, date, e.target.value)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 17,
                          padding: 0,
                          outline: 'none',
                          fontFamily: 'inherit',
                          color: isPast ? 'var(--label-tertiary)' : 'var(--label)',
                          lineHeight: 1.3,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                      />
                    </ListRow>
                  )
                })}
              </ListSection>
            )}
          </>
        )}
      </div>

      <Sheet
        open={nameSheet !== null}
        onClose={() => setNameSheet(null)}
        title={nameSheet === 'add' ? '献立表を追加' : '献立表の編集'}
        onConfirm={commitName}
        confirmDisabled={draftName.trim() === ''}
      >
        <ListSection>
          <ListRow>
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="例: 小学校"
              autoFocus={nameSheet === 'add'}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                fontSize: 17,
                padding: 0,
                outline: 'none',
                fontFamily: 'inherit',
                color: 'var(--label)',
              }}
            />
          </ListRow>
        </ListSection>

        {nameSheet === 'manage' && (
          <ListSection>
            <ListRow onClick={() => setDeleteOpen(true)} destructive>
              この献立表を削除
            </ListRow>
          </ListSection>
        )}
      </Sheet>

      <AlertDialog
        open={deleteOpen}
        title="献立表を削除"
        message={`「${selected?.name}」 の献立を完全に削除します。 元に戻せません。`}
        confirmLabel="削除"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  )
}

function MonthButton({ onClick, label, children }: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press-feedback"
      style={{
        width: 44, height: 44, borderRadius: 999,
        border: 'none',
        background: 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

// 給食があるのは平日のみなので月〜金だけ並べる
function weekdaysOfMonth(year: number, month: number): string[] {
  const out: string[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const day = d.getDay()
    if (day >= 1 && day <= 5) out.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short',
  })
}
