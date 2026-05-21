import { useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import type { Schedule } from '@famicale/shared'
import NavBar from '../components/NavBar'
import Sheet from '../components/Sheet'
import AlertDialog from '../components/AlertDialog'
import { ListSection, ListRow } from '../components/List'
import { useSchedules } from '../state/schedules'
import { classify, statusAccent, gaugeFill, isBirthdayEvent, type EventStatus } from '../lib/event-status'

type EditField = 'title' | 'tags' | 'notes' | null

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { byId, update, remove, setStatus, items } = useSchedules()
  const schedule = id ? byId(id) : undefined

  const knownTags = useMemo(
    () => Array.from(new Set(items.flatMap(s => s.tags ?? []))).sort(),
    [items]
  )

  const [editing, setEditing] = useState<EditField>(null)
  const [draftText, setDraftText] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [endDateClearConfirmOpen, setEndDateClearConfirmOpen] = useState(false)

  if (!schedule) {
    return (
      <>
        <NavBar back={{ to: '/' }} />
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--label-secondary)' }}>
          イベントが見つかりません
        </div>
      </>
    )
  }

  const status = classify(schedule)
  const accent = schedule.status === 'cancelled' ? '#8e8e93' : statusAccent(status)
  const gauge = schedule.status === 'cancelled' ? null : gaugeFill(schedule, status)
  const cancelled = schedule.status === 'cancelled'
  const heroInfo = heroText(status, cancelled, schedule)

  function confirmDelete() {
    if (!schedule) return
    remove(schedule.id)
    navigate('/', { replace: true })
  }

  function handleToggleCancel() {
    if (!schedule) return
    setStatus(schedule.id, cancelled ? 'active' : 'cancelled')
  }

  function openEdit(field: Exclude<EditField, null>) {
    if (!schedule) return
    setEditing(field)
    if (field === 'tags') {
      setDraftTags(schedule.tags ?? [])
    } else {
      const initial =
        field === 'title' ? schedule.title :
        field === 'notes' ? (schedule.notes ?? '') :
        ''
      setDraftText(initial)
    }
  }

  function commit() {
    if (!editing || !schedule) return
    switch (editing) {
      case 'title':
        if (draftText.trim()) update(schedule.id, { title: draftText })
        break
      case 'notes':
        update(schedule.id, { notes: draftText || undefined })
        break
      case 'tags':
        update(schedule.id, { tags: draftTags })
        break
    }
    setEditing(null)
  }

  const sheetTitle =
    editing === 'title' ? 'イベント名' :
    editing === 'tags' ? 'タグ' :
    editing === 'notes' ? 'メモ' : ''

  const confirmDisabled = editing === 'title' && draftText.trim() === ''

  return (
    <>
      <NavBar title={schedule.title} back={{ to: '/' }} />

      <div style={{ padding: '8px 20px 28px' }}>
        <button
          type="button"
          onClick={() => openEdit('title')}
          className="press-feedback"
          style={{
            display: 'block',
            background: 'transparent',
            border: 'none',
            padding: '4px 0',
            margin: 0,
            textAlign: 'left',
            width: '100%',
            cursor: 'pointer',
          }}
        >
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--label)',
            textDecoration: cancelled ? 'line-through' : 'none',
            opacity: cancelled ? 0.55 : 1,
            lineHeight: 1.25,
            letterSpacing: -0.2,
          }}>
            {schedule.title}
          </h1>
        </button>

        <div style={{
          marginTop: 14,
          fontSize: 13,
          fontWeight: 600,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          minHeight: 16,
        }}>
          {heroInfo.label || ' '}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{
            fontSize: heroInfo.bigNumber.length > 2 ? 42 : 64,
            fontWeight: 700,
            color: accent,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: heroInfo.bigNumber.length > 2 ? -0.5 : -2,
          }}>
            {heroInfo.bigNumber}
          </span>
          {heroInfo.unit && (
            <span style={{
              fontSize: 24,
              fontWeight: 600,
              color: accent,
              lineHeight: 1,
            }}>
              {heroInfo.unit}
            </span>
          )}
        </div>

        <div style={{
          marginTop: 6,
          fontSize: 15,
          color: 'var(--label-secondary)',
          lineHeight: 1.4,
          minHeight: 21,
        }}>
          {heroInfo.subtitle || ' '}
        </div>

        <div style={{
          marginTop: 16,
          height: 6,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {gauge && (
            <div style={{
              position: 'absolute',
              [gauge.fillFrom]: 0,
              top: 0, bottom: 0,
              width: `${gauge.fill * 100}%`, background: accent,
              transition: 'width 0.3s ease',
            }} />
          )}
        </div>
      </div>

      <ListSection header="日付" footer="複数日にまたがるイベントのみ終了日を入力 (空欄なら単日)">
        <ListRow label="開始日">
          <input
            key={`start-${schedule.startDate}`}
            type="date"
            defaultValue={schedule.startDate}
            onBlur={e => {
              const v = e.target.value
              if (v && v !== schedule.startDate) {
                update(schedule.id, { startDate: v })
              }
            }}
            style={inlineDateInputStyle}
          />
        </ListRow>
        <ListRow label="終了日">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
            <input
              key={`end-${schedule.endDate ?? 'none'}`}
              type="date"
              defaultValue={schedule.endDate ?? ''}
              onBlur={e => {
                const v = e.target.value
                if (v !== (schedule.endDate ?? '')) {
                  update(schedule.id, { endDate: v || undefined })
                }
              }}
              min={schedule.startDate}
              style={{
                ...inlineDateInputStyle,
                color: schedule.endDate ? 'var(--label)' : 'var(--label-tertiary)',
                paddingRight: schedule.endDate ? 32 : 0,
              }}
            />
            {schedule.endDate && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setEndDateClearConfirmOpen(true)
                }}
                aria-label="終了日をクリア"
                style={{
                  position: 'absolute',
                  right: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(120, 120, 128, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} strokeWidth={3} color="#fff" />
              </button>
            )}
          </div>
        </ListRow>
      </ListSection>

      <ListSection header="タグ">
        <ListRow
          align="vertical"
          onClick={() => openEdit('tags')}
        >
          {schedule.tags && schedule.tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {schedule.tags.map(t => (
                <Link
                  key={t}
                  to={`/?tag=${encodeURIComponent(t)}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(0, 122, 255, 0.12)',
                    color: 'var(--tint)',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >{t}</Link>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--label-tertiary)', fontSize: 17 }}>未設定</span>
          )}
        </ListRow>
      </ListSection>

      <ListSection header="メモ">
        <ListRow align="vertical" onClick={() => openEdit('notes')}>
          {schedule.notes ? (
            <div style={{
              whiteSpace: 'pre-wrap',
              fontSize: 17,
              color: 'var(--label)',
              lineHeight: 1.45,
            }}>{schedule.notes}</div>
          ) : (
            <span style={{ color: 'var(--label-tertiary)', fontSize: 17 }}>未入力</span>
          )}
        </ListRow>
      </ListSection>

      <ListSection>
        <ListRow
          key={cancelled ? 'reactivate' : 'cancel'}
          onClick={handleToggleCancel}
        >
          <span style={{ color: 'var(--tint)' }}>
            {cancelled ? 'このイベントを再開する' : '中止する'}
          </span>
        </ListRow>
      </ListSection>

      <ListSection>
        <ListRow onClick={() => setDeleteConfirmOpen(true)} destructive>
          削除する
        </ListRow>
      </ListSection>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={sheetTitle}
        onConfirm={commit}
        confirmDisabled={!!confirmDisabled}
      >
        {editing === 'title' && (
          <input
            type="text"
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            placeholder="イベント名"
            autoFocus
            style={sheetInputStyle}
          />
        )}
        {editing === 'tags' && (
          <TagInputInSheet
            value={draftTags}
            onChange={setDraftTags}
            knownTags={knownTags}
          />
        )}
        {editing === 'notes' && (
          <textarea
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            placeholder="メモ"
            autoFocus
            rows={8}
            style={{ ...sheetInputStyle, resize: 'none', minHeight: 160 }}
          />
        )}
      </Sheet>

      <AlertDialog
        open={deleteConfirmOpen}
        title="このイベントを削除しますか？"
        message="履歴に残らず完全に消え、元に戻せません。"
        confirmLabel="削除"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <AlertDialog
        open={endDateClearConfirmOpen}
        title="終了日をクリアしますか？"
        message="単日イベントになります。"
        confirmLabel="クリア"
        destructive
        onConfirm={() => {
          update(schedule.id, { endDate: undefined })
          setEndDateClearConfirmOpen(false)
        }}
        onCancel={() => setEndDateClearConfirmOpen(false)}
      />
    </>
  )
}

function TagInputInSheet({ value, onChange, knownTags }: {
  value: string[]
  onChange: (tags: string[]) => void
  knownTags: string[]
}) {
  const [input, setInput] = useState('')

  function addTag(t: string) {
    const trimmed = t.trim()
    if (!trimmed || value.includes(trimmed)) { setInput(''); return }
    onChange([...value, trimmed])
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
  }

  const suggestions = knownTags.filter(t => !value.includes(t))

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {value.map(t => (
            <span key={t} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 6px 4px 10px',
              borderRadius: 999,
              background: 'rgba(0, 122, 255, 0.12)',
              color: 'var(--tint)',
              fontSize: 13,
              fontWeight: 500,
            }}>
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter(x => x !== t))}
                aria-label={`${t} を削除`}
                style={{
                  width: 18, height: 18, borderRadius: 999,
                  background: 'rgba(120, 120, 128, 0.18)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={11} strokeWidth={3} color="var(--label-secondary)" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input.trim() && addTag(input)}
        placeholder="タグを追加 (Enter or , で確定)"
        style={sheetInputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'transparent',
                border: '0.5px solid var(--separator)',
                color: 'var(--label-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

const sheetInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  padding: '14px 20px',
  borderRadius: 27,
  border: 'none',
  background: 'var(--bg-card)',
  fontSize: 17,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--label)',
  lineHeight: 1.4,
  textAlign: 'left',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none',
}

const inlineDateInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 17,
  padding: 0,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--label)',
  lineHeight: 1.3,
  textAlign: 'left',
}

function heroText(status: EventStatus, cancelled: boolean, schedule: Schedule): {
  label: string
  bigNumber: string
  unit?: string
  subtitle: string
} {
  if (cancelled) {
    return { label: '', bigNumber: '中止', subtitle: '' }
  }
  const isBirthday = isBirthdayEvent(schedule)
  switch (status.kind) {
    case 'upcoming-soon':
    case 'upcoming':
      return {
        label: isBirthday ? '誕生日まで' : '開催まで',
        bigNumber: String(status.daysUntilStart),
        unit: '日',
        subtitle: isBirthday ? 'あと少しで誕生日' : 'あと少しでスタート',
      }
    case 'ongoing-today':
      return { label: '', bigNumber: '今日', subtitle: '' }
    case 'ongoing':
    case 'ending-soon':
      if (status.daysUntilEnd === 0) {
        return { label: '', bigNumber: '本日終了', subtitle: '' }
      }
      return {
        label: '終了まで',
        bigNumber: String(status.daysUntilEnd),
        unit: '日',
        subtitle: '開催中です',
      }
    case 'past':
      if (status.daysSinceEnd === 1) {
        return { label: '', bigNumber: '昨日', subtitle: '終了' }
      }
      return {
        label: '',
        bigNumber: String(status.daysSinceEnd),
        unit: '日前',
        subtitle: '終了',
      }
  }
}

