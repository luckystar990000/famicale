import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { DayOfWeek } from '@famicale/shared'
import NavBar from '../components/NavBar'
import Sheet from '../components/Sheet'
import AlertDialog from '../components/AlertDialog'
import { ListSection, ListRow } from '../components/List'
import SuggestionChips from '../components/SuggestionChips'
import { useTimetables } from '../state/timetables'

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5]
const DAY_LABELS: Record<DayOfWeek, string> = { 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土' }
const MIN_PERIODS = 6

type EditingCell = { dayOfWeek: DayOfWeek; period: number; current: string }

export default function TimetablePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { byId, update, setCell, clearCell, remove, knownSubjects } = useTimetables()
  const tt = id ? byId(id) : undefined

  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [draftSubject, setDraftSubject] = useState('')
  const [ownerEditing, setOwnerEditing] = useState(false)
  const [draftOwner, setDraftOwner] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!tt) {
    return (
      <>
        <NavBar back={{ to: '/timetables' }} title="時間割" />
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--label-secondary)' }}>
          時間割が見つかりません
        </div>
      </>
    )
  }

  const cellMap = new Map<string, string>()
  for (const c of tt.cells) cellMap.set(`${c.dayOfWeek}-${c.period}`, c.subject)
  const maxPeriod = tt.cells.reduce((m, c) => Math.max(m, c.period), 0)
  const periods = Array.from({ length: Math.max(maxPeriod, MIN_PERIODS) }, (_, i) => i + 1)

  function openCell(d: DayOfWeek, p: number) {
    const current = cellMap.get(`${d}-${p}`) ?? ''
    setEditing({ dayOfWeek: d, period: p, current })
    setDraftSubject(current)
  }

  function commitCell() {
    if (!editing || !id) return
    const subject = draftSubject.trim()
    if (subject) {
      setCell(id, { dayOfWeek: editing.dayOfWeek, period: editing.period, subject })
    } else if (editing.current) {
      clearCell(id, editing.dayOfWeek, editing.period)
    }
    setEditing(null)
  }

  function clearCurrentCell() {
    if (!editing || !id) return
    clearCell(id, editing.dayOfWeek, editing.period)
    setEditing(null)
  }

  function openOwnerEdit() {
    setDraftOwner(tt?.owner ?? '')
    setOwnerEditing(true)
  }

  function commitOwner() {
    const owner = draftOwner.trim()
    if (id && owner) update(id, { owner })
    setOwnerEditing(false)
  }

  function handleDelete() {
    if (!id) return
    remove(id)
    navigate('/timetables', { replace: true })
  }

  return (
    <>
      <NavBar
        back={{ to: '/timetables' }}
        title={`${tt.owner} の時間割`}
      />

      <div style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{
            background: 'var(--bg-card)',
            backdropFilter: 'saturate(160%) blur(22px)',
            WebkitBackdropFilter: 'saturate(160%) blur(22px)',
            border: '0.5px solid var(--glass-border)',
            boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0, 0, 0, 0.05)',
            borderRadius: 27,
            padding: 10,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `28px repeat(${DAYS.length}, 1fr)`,
              gap: 4,
            }}>
              <div />
              {DAYS.map(d => (
                <div key={d} style={dayHeaderStyle}>{DAY_LABELS[d]}</div>
              ))}
              {periods.map(p => (
                <Fragment key={p}>
                  <div style={periodHeaderStyle}>{p}</div>
                  {DAYS.map(d => {
                    const subj = cellMap.get(`${d}-${p}`)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => openCell(d, p)}
                        style={cellStyle(!!subj)}
                      >
                        {subj ?? ''}
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <ListSection header="この時間割の設定">
          <ListRow label="名前" onClick={openOwnerEdit} trailing={<span style={{ fontSize: 15, color: 'var(--label-secondary)' }}>{tt.owner}</span>} />
          <ListRow onClick={() => setDeleteOpen(true)} destructive>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trash2 size={18} strokeWidth={2.2} color="var(--destructive)" />
              <span>時間割を削除</span>
            </div>
          </ListRow>
        </ListSection>
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `${DAY_LABELS[editing.dayOfWeek]}曜 ${editing.period}限` : ''}
        onConfirm={commitCell}
      >
        <ListSection>
          <ListRow>
            <input
              type="text"
              value={draftSubject}
              onChange={e => setDraftSubject(e.target.value)}
              placeholder="科目 (例: 体育)"
              autoFocus
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

        <SuggestionChips items={knownSubjects} onPick={setDraftSubject} />

        {editing?.current && (
          <ListSection>
            <ListRow onClick={clearCurrentCell} destructive>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trash2 size={18} strokeWidth={2.2} color="var(--destructive)" />
                <span>クリア</span>
              </div>
            </ListRow>
          </ListSection>
        )}
      </Sheet>

      <Sheet
        open={ownerEditing}
        onClose={() => setOwnerEditing(false)}
        title="誰の時間割か"
        onConfirm={commitOwner}
        confirmDisabled={draftOwner.trim() === ''}
      >
        <ListSection>
          <ListRow>
            <input
              type="text"
              value={draftOwner}
              onChange={e => setDraftOwner(e.target.value)}
              autoFocus
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
      </Sheet>

      <AlertDialog
        open={deleteOpen}
        title="時間割を削除"
        message={`「${tt.owner}」 の時間割を完全に削除します。 元に戻せません。`}
        confirmLabel="削除"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => { setDeleteOpen(false); handleDelete() }}
      />
    </>
  )
}

const dayHeaderStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--label-secondary)',
  padding: '6px 0',
}

const periodHeaderStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--label-tertiary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function cellStyle(filled: boolean): React.CSSProperties {
  return {
    minHeight: 48,
    borderRadius: 14,
    border: 'none',
    background: filled ? 'rgba(0, 122, 255, 0.12)' : 'rgba(120, 120, 128, 0.08)',
    color: filled ? 'var(--tint)' : 'var(--label-tertiary)',
    fontSize: 13,
    fontWeight: filled ? 600 : 400,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 1.1,
  }
}
