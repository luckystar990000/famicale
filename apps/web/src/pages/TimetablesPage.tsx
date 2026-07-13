import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import NavBar from '../components/NavBar'
import Sheet from '../components/Sheet'
import { ListSection, ListRow } from '../components/List'
import SuggestionChips from '../components/SuggestionChips'
import { useTimetables } from '../state/timetables'
import { useSchedules } from '../state/schedules'

export default function TimetablesPage() {
  const navigate = useNavigate()
  const { items, create, move } = useTimetables()
  const { knownTags } = useSchedules()
  const [newOpen, setNewOpen] = useState(false)
  const [draftOwner, setDraftOwner] = useState('')
  const [reordering, setReordering] = useState(false)

  function handleCreate() {
    const owner = draftOwner.trim()
    if (!owner) return
    const t = create({ owner, cells: [] })
    setNewOpen(false)
    setDraftOwner('')
    navigate(`/timetables/${t.id}`)
  }

  function openNew() {
    setDraftOwner('')
    setNewOpen(true)
  }

  return (
    <>
      <NavBar
        title="時間割"
        rightAction={{ label: '追加', icon: 'plus', onClick: openNew }}
      />

      <div style={{ paddingTop: 16 }}>
        {items.length === 0 ? (
          <EmptyState onCreate={openNew} />
        ) : (
          <>
            {items.length >= 2 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px 6px' }}>
                <button
                  type="button"
                  onClick={() => setReordering(r => !r)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tint)',
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {reordering ? '完了' : '並べ替え'}
                </button>
              </div>
            )}
            <ListSection header={`登録済み (${items.length})`}>
              {items.map((t, i) => (
                <ListRow key={t.id}>
                  {reordering ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 600, color: 'var(--label)' }}>
                        {t.owner}
                      </div>
                      <button
                        type="button"
                        onClick={() => move(t.id, -1)}
                        disabled={i === 0}
                        style={reorderBtnStyle(i === 0)}
                      >
                        <ChevronUp size={20} strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(t.id, 1)}
                        disabled={i === items.length - 1}
                        style={reorderBtnStyle(i === items.length - 1)}
                      >
                        <ChevronDown size={20} strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/timetables/${t.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--label)' }}>
                          {t.owner}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>
                          {t.cells.length} マス
                        </div>
                      </div>
                      <ChevronRight size={18} strokeWidth={2.2} color="var(--label-tertiary)" />
                    </Link>
                  )}
                </ListRow>
              ))}
            </ListSection>
          </>
        )}
      </div>

      <Sheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="新しい時間割"
        onConfirm={handleCreate}
        confirmDisabled={draftOwner.trim() === ''}
      >
        <ListSection header="誰の時間割か">
          <ListRow>
            <input
              type="text"
              value={draftOwner}
              onChange={e => setDraftOwner(e.target.value)}
              placeholder="長男"
              autoFocus
              style={{
                width: '100%',
                minWidth: 0,
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

        <SuggestionChips items={knownTags} onPick={setDraftOwner} />
      </Sheet>
    </>
  )
}

function reorderBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    border: 'none',
    background: 'rgba(120, 120, 128, 0.12)',
    color: disabled ? 'var(--label-tertiary)' : 'var(--tint)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    flexShrink: 0,
  }
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ padding: '24px 16px 0' }}>
      <button
        type="button"
        onClick={onCreate}
        className="press-feedback"
        style={{
          width: '100%',
          minHeight: 200,
          background: 'var(--bg-card)',
          backdropFilter: 'saturate(160%) blur(22px)',
          WebkitBackdropFilter: 'saturate(160%) blur(22px)',
          border: '0.5px solid var(--glass-border)',
          boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0,0,0,0.05)',
          borderRadius: 27,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          cursor: 'pointer',
          padding: '36px 20px',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 27,
          background: 'rgba(0, 122, 255, 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Plus size={30} strokeWidth={2.2} color="var(--tint)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)' }}>
          時間割を追加
        </div>
        <div style={{ fontSize: 13, color: 'var(--label-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
          子供ごとに 1 つ作って<br />
          曜日 × 時限のグリッドで管理
        </div>
      </button>
    </div>
  )
}
