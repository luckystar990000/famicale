import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, ChevronRight, Check, X, Search } from 'lucide-react'
import type { Schedule } from '@famicale/shared'
import {
  classify, statusBadge, statusAccent, gaugeFill,
  type EventStatus,
} from '../lib/event-status'
import { useSchedules } from '../state/schedules'

type TabId = 'all' | 'ongoing' | 'ending' | 'upcoming' | 'starting'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: '全て' },
  { id: 'ongoing', label: '開催中' },
  { id: 'ending', label: '終わりそう' },
  { id: 'upcoming', label: 'まだ' },
  { id: 'starting', label: '始まりそう' },
]

type Item = { schedule: Schedule; status: EventStatus }

function inTab(kind: EventStatus['kind'], tab: TabId): boolean {
  if (tab === 'all') return kind !== 'past'
  if (tab === 'ongoing') return kind === 'ongoing-today' || kind === 'ongoing' || kind === 'ending-soon'
  if (tab === 'upcoming') return kind === 'upcoming-soon' || kind === 'upcoming'
  if (tab === 'ending') return kind === 'ending-soon'
  if (tab === 'starting') return kind === 'upcoming-soon'
  return false
}

function statusRank(kind: EventStatus['kind']): number {
  switch (kind) {
    case 'ongoing-today': return 0
    case 'ending-soon': return 1
    case 'ongoing': return 2
    case 'upcoming-soon': return 3
    case 'upcoming': return 4
    case 'past': return 5
  }
}

function sortForTab(items: Item[], tab: TabId): Item[] {
  const arr = [...items]
  if (tab === 'all') {
    arr.sort((a, b) => {
      const r = statusRank(a.status.kind) - statusRank(b.status.kind)
      if (r !== 0) return r
      return a.schedule.startDate.localeCompare(b.schedule.startDate)
    })
  } else if (tab === 'ongoing' || tab === 'ending') {
    arr.sort((a, b) => {
      const ae = a.schedule.endDate ?? a.schedule.startDate
      const be = b.schedule.endDate ?? b.schedule.startDate
      return ae.localeCompare(be)
    })
  } else if (tab === 'upcoming' || tab === 'starting') {
    arr.sort((a, b) => a.schedule.startDate.localeCompare(b.schedule.startDate))
  }
  return arr
}

export default function CountdownPage() {
  const { items } = useSchedules()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTag = searchParams.get('tag')

  const knownTags = useMemo(
    () => Array.from(new Set(items.flatMap(s => s.tags ?? []))).sort(),
    [items]
  )

  function setSelectedTag(t: string | null) {
    const next = new URLSearchParams(searchParams)
    if (t) next.set('tag', t)
    else next.delete('tag')
    setSearchParams(next, { replace: true })
  }

  const today = new Date()
  const dateText = today.toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'short'
  })

  const classified = useMemo(
    () => items.map<Item>(s => ({ schedule: s, status: classify(s) })),
    [items]
  )

  const active = useMemo(
    () => classified.filter(i => i.schedule.status !== 'cancelled'),
    [classified]
  )

  const closed = useMemo(
    () => classified.filter(i => i.schedule.status === 'cancelled' || i.status.kind === 'past'),
    [classified]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matchesQuery = (s: Schedule) => {
      if (!q) return true
      if (s.title.toLowerCase().includes(q)) return true
      if (s.notes?.toLowerCase().includes(q)) return true
      if (s.tags?.some(t => t.toLowerCase().includes(q))) return true
      return false
    }
    const matchesTag = (s: Schedule) => !selectedTag || (s.tags?.includes(selectedTag) ?? false)
    const filtered = active.filter(i =>
      inTab(i.status.kind, tab) && matchesQuery(i.schedule) && matchesTag(i.schedule)
    )
    return sortForTab(filtered, tab)
  }, [active, tab, query, selectedTag])

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, ongoing: 0, upcoming: 0, ending: 0, starting: 0 }
    for (const i of active) {
      for (const t of TABS) {
        if (inTab(i.status.kind, t.id)) c[t.id]++
      }
    }
    return c
  }, [active])

  const showClosed = tab === 'all' && closed.length > 0

  return (
    <>
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 12px) 20px 12px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--label-secondary)', marginBottom: 2 }}>
            今日 {dateText}
          </div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, color: 'var(--label)', letterSpacing: -0.5 }}>
            ファミカレ
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/share')}
          aria-label="共有"
          style={{
            width: 38, height: 38, borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'saturate(180%) blur(14px)',
            WebkitBackdropFilter: 'saturate(180%) blur(14px)',
            border: '0.5px solid rgba(255, 255, 255, 0.6)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 4px rgba(0, 0, 0, 0.05)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            flexShrink: 0,
          }}
        >
          <Share2 size={18} strokeWidth={2.2} color="var(--label)" />
        </button>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <div style={{ padding: '0 16px' }}>
        <SegmentedControl value={tab} onChange={setTab} counts={counts} />
      </div>

      {knownTags.length > 0 && (
        <TagFilter
          tags={knownTags}
          selected={selectedTag}
          onChange={setSelectedTag}
        />
      )}

      <div style={{ padding: '0 16px' }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--label-secondary)' }}>
            <p style={{ fontSize: 15, margin: 0 }}>{emptyMessage(tab)}</p>
            {selectedTag && (
              <>
                <p style={{ fontSize: 13, margin: '6px 0 12px' }}>
                  「{selectedTag}」 タグで絞り込み中
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: 'none',
                    background: 'var(--tint)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  タグの絞り込みを解除
                </button>
              </>
            )}
          </div>
        )}

        {visible.map(({ schedule, status }) => (
          <EventCard
            key={schedule.id}
            schedule={schedule}
            status={status}
            onTagClick={setSelectedTag}
          />
        ))}

        {showClosed && (
          <details style={{ marginTop: 24 }}>
            <summary style={{ color: 'var(--label-secondary)', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
              終わったイベント ({closed.length})
            </summary>
            <div style={{ marginTop: 8 }}>
              {[...closed].sort((a, b) => b.schedule.startDate.localeCompare(a.schedule.startDate))
                .map(({ schedule, status }) => (
                  <EventCard
                    key={schedule.id}
                    schedule={schedule}
                    status={status}
                    onTagClick={setSelectedTag}
                  />
                ))}
            </div>
          </details>
        )}
      </div>
    </>
  )
}

function emptyMessage(tab: TabId): string {
  switch (tab) {
    case 'all': return '直近の予定はありません'
    case 'ongoing': return '今開催中のイベントはありません'
    case 'upcoming': return 'これから始まる予定はありません'
    case 'ending': return 'もうすぐ終わるイベントはありません'
    case 'starting': return 'もうすぐ始まる予定はありません'
  }
}

function TagFilter({ tags, selected, onChange }: {
  tags: string[]
  selected: string | null
  onChange: (t: string | null) => void
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '0 16px 16px',
      marginTop: -8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <TagChip label="全て" active={!selected} onClick={() => onChange(null)} />
      {tags.map(t => (
        <TagChip
          key={t}
          label={t}
          active={selected === t}
          onClick={() => onChange(selected === t ? null : t)}
        />
      ))}
    </div>
  )
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '5px 12px',
        borderRadius: 999,
        border: active ? 'none' : '0.5px solid var(--glass-border)',
        background: active ? 'var(--tint)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: active ? 'none' : 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: active ? 'none' : 'saturate(180%) blur(14px)',
        boxShadow: active ? 'none' : 'inset 0 1px 0 var(--glass-inner-hi)',
        color: active ? '#fff' : 'var(--label)',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(120, 120, 128, 0.12)',
      borderRadius: 27,
      padding: '0 14px',
      height: 36,
    }}>
      <Search size={16} strokeWidth={2.2} color="var(--label-tertiary)" style={{ flexShrink: 0 }} />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="イベントを検索"
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 8,
          border: 'none',
          background: 'transparent',
          fontSize: 16,
          color: 'var(--label)',
          outline: 'none',
          padding: 0,
          fontFamily: 'inherit',
          WebkitAppearance: 'none',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="検索をクリア"
          style={{
            width: 18, height: 18, borderRadius: 999,
            background: 'rgba(120, 120, 128, 0.45)',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            marginLeft: 6,
            flexShrink: 0,
          }}
        >
          <X size={11} strokeWidth={3} color="#fff" />
        </button>
      )}
    </div>
  )
}

function SegmentedControl({ value, onChange, counts }: {
  value: TabId
  onChange: (v: TabId) => void
  counts: Record<TabId, number>
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.35)',
      backdropFilter: 'saturate(160%) blur(18px)',
      WebkitBackdropFilter: 'saturate(160%) blur(18px)',
      border: '0.5px solid rgba(255, 255, 255, 0.55)',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.55)',
      borderRadius: 27,
      padding: 3,
      marginBottom: 14,
      gap: 1,
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {TABS.map(({ id, label }) => {
        const active = value === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              flex: '0 0 auto',
              padding: '6px 11px',
              border: 'none',
              borderRadius: 27,
              background: active ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
              color: 'var(--label)',
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: active
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 1px 3px rgba(0, 0, 0, 0.08)'
                : 'none',
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{label}</span>
            {counts[id] > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: 'var(--label-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{counts[id]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function EventCard({ schedule, status, onTagClick }: {
  schedule: Schedule
  status: EventStatus
  onTagClick: (tag: string) => void
}) {
  const cancelled = schedule.status === 'cancelled'
  const badge = statusBadge(status)
  const accent = cancelled
    ? '#9ca3af'
    : status.kind === 'past'
      ? '#9ca3af'
      : statusAccent(status)
  const gauge = cancelled ? null : gaugeFill(schedule, status)
  const isOngoing = status.kind === 'ongoing' || status.kind === 'ending-soon' || status.kind === 'ongoing-today'
  const dateText = formatDateLabel(schedule, status)
  const isSoon = !cancelled && (status.kind === 'upcoming-soon' || status.kind === 'ending-soon')

  return (
    <Link
      to={`/events/${schedule.id}`}
      className="press-feedback"
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        marginBottom: 10,
        background: 'var(--bg-card)',
        backdropFilter: 'saturate(160%) blur(22px)',
        WebkitBackdropFilter: 'saturate(160%) blur(22px)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 18px rgba(0, 0, 0, 0.06)',
        borderRadius: 27,
        overflow: 'hidden',
        opacity: cancelled ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
        <StatusDot status={status} cancelled={cancelled} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: 'var(--label)', marginBottom: 2,
            textDecoration: cancelled ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {schedule.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--label-secondary)' }}>{dateText}</div>
          {schedule.notes && (
            <div style={{
              fontSize: 13,
              color: 'var(--label-secondary)',
              marginTop: 4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
            }}>
              {schedule.notes}
            </div>
          )}
          {schedule.tags && schedule.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {schedule.tags.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onTagClick(t)
                  }}
                  style={{ ...cardTagChipStyle, border: 'none', cursor: 'pointer' }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div
            className={isSoon ? 'badge-pulse' : undefined}
            style={{
              padding: '4px 10px', borderRadius: 999,
              background: cancelled ? '#fee2e2' : badge.bg,
              color: cancelled ? '#991b1b' : badge.color,
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {cancelled ? '中止' : badge.label}
          </div>
          <ChevronRight size={18} strokeWidth={2.2} color="var(--label-tertiary)" />
        </div>
      </div>

      {gauge && (
        <div
          role="progressbar"
          aria-label={isOngoing ? '残り期間' : '開始まで'}
          aria-valuenow={Math.round(gauge.fill * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 4, background: 'rgba(0,0,0,0.05)', position: 'relative' }}
        >
          <div style={{
            position: 'absolute',
            [gauge.fillFrom]: 0,
            top: 0, bottom: 0,
            width: `${gauge.fill * 100}%`, background: accent,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </Link>
  )
}

function StatusDot({ status, cancelled, accent }: { status: EventStatus; cancelled: boolean; accent: string }): ReactNode {
  const filled = !cancelled && (
    status.kind === 'ongoing-today' ||
    status.kind === 'ongoing' ||
    status.kind === 'ending-soon'
  )
  const ringColor = cancelled ? '#9ca3af' : accent
  const showCheck = !cancelled && status.kind === 'past'
  const showCross = cancelled
  const solid = filled || showCheck || showCross

  return (
    <div style={{
      width: 24, height: 24,
      borderRadius: 999,
      border: `2px solid ${ringColor}`,
      background: solid ? ringColor : 'transparent',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {showCheck && <Check size={14} strokeWidth={3.5} color="#fff" />}
      {showCross && <X size={14} strokeWidth={3.5} color="#fff" />}
    </div>
  )
}

const cardTagChipStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(0, 122, 255, 0.12)',
  color: 'var(--tint)',
  fontSize: 11,
  fontWeight: 500,
}

function formatDateLabel(schedule: Schedule, status: EventStatus): string {
  if (schedule.status === 'cancelled') {
    if (!schedule.endDate || schedule.endDate === schedule.startDate) return formatMD(schedule.startDate)
    return `${formatMD(schedule.startDate)} 〜 ${formatMD(schedule.endDate)}`
  }
  if (status.kind === 'upcoming-soon') return `${formatMD(schedule.startDate)} 開催`
  if (status.kind === 'ending-soon' && schedule.endDate) return `${formatMD(schedule.endDate)} 終了`
  if (!schedule.endDate || schedule.endDate === schedule.startDate) {
    return formatMD(schedule.startDate)
  }
  return `${formatMD(schedule.startDate)} 〜 ${formatMD(schedule.endDate)}`
}

function formatMD(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short'
  })
}
