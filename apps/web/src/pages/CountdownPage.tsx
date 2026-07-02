import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, X, Search } from 'lucide-react'
import type { Schedule, DayOfWeek, Timetable } from '@famicale/shared'
import { classify, isRecentlyEnded } from '../lib/event-status'
import { TABS, inTab, sortForTab, emptyMessage, type TabId, type Item } from '../lib/event-filters'
import { useSchedules } from '../state/schedules'
import { useTimetables } from '../state/timetables'
import AlertDialog from '../components/AlertDialog'
import EventCard from '../components/EventCard'
import SegmentedControl from '../components/SegmentedControl'

export default function CountdownPage() {
  const { items, knownTags, deleteTag } = useSchedules()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTag = searchParams.get('tag')
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)

  const usedTagSet = useMemo(() => {
    const set = new Set<string>()
    for (const s of items) {
      if (s.tags) for (const t of s.tags) set.add(t)
    }
    return set
  }, [items])

  const usageCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of items) {
      if (!s.tags) continue
      for (const t of s.tags) m.set(t, (m.get(t) ?? 0) + 1)
    }
    return m
  }, [items])

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
    () => items.map<Item>(s => ({
      schedule: s,
      status: classify(s),
      eventStatus: classify(s, undefined, { ignoreVisitDate: true }),
    })),
    [items]
  )

  const active = useMemo(
    () => classified.filter(i => i.schedule.status !== 'cancelled'),
    [classified]
  )

  const closed = useMemo(
    () => classified.filter(i =>
      i.schedule.status === 'cancelled' ||
      (i.eventStatus.kind === 'past' && !isRecentlyEnded(i.eventStatus))
    ),
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
      inTab(i.eventStatus, tab) && matchesQuery(i.schedule) && matchesTag(i.schedule)
    )
    return sortForTab(filtered, tab)
  }, [active, tab, query, selectedTag])

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, ongoing: 0, upcoming: 0, ending: 0, starting: 0 }
    for (const i of active) {
      for (const t of TABS) {
        if (inTab(i.eventStatus, t.id)) c[t.id]++
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
            width: 44, height: 44, borderRadius: 999,
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
          <Share2 size={22} strokeWidth={2.2} color="var(--label)" />
        </button>
      </div>

      <TodayTimetables />

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
          usedTagSet={usedTagSet}
          onChange={setSelectedTag}
          onLongPress={t => setTagToDelete(t)}
        />
      )}

      <AlertDialog
        open={tagToDelete !== null}
        title={`「${tagToDelete}」 タグを削除`}
        message={
          tagToDelete && usageCount.get(tagToDelete)
            ? `このタグを付けたイベントが ${usageCount.get(tagToDelete)} 件あります。 全てから外して削除します。`
            : 'このタグを削除します。 イベントには付いていません。'
        }
        confirmLabel="削除"
        destructive
        onCancel={() => setTagToDelete(null)}
        onConfirm={() => {
          if (tagToDelete) {
            deleteTag(tagToDelete)
            if (selectedTag === tagToDelete) setSelectedTag(null)
          }
          setTagToDelete(null)
        }}
      />

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

        {visible.map(({ schedule, status, eventStatus }) => (
          <EventCard
            key={schedule.id}
            schedule={schedule}
            status={status}
            eventStatus={eventStatus}
            to={`/events/${schedule.id}`}
            onTagClick={setSelectedTag}
          />
        ))}

        {showClosed && (
          <details
            style={{ marginTop: 24 }}
            onToggle={e => {
              if (e.currentTarget.open) {
                requestAnimationFrame(() => {
                  document.querySelector('main')?.scrollBy({ top: 100, behavior: 'smooth' })
                })
              }
            }}
          >
            <summary style={{ color: 'var(--label-secondary)', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
              終わったイベント ({closed.length})
            </summary>
            <div style={{ marginTop: 8 }}>
              {[...closed].sort((a, b) => b.schedule.startDate.localeCompare(a.schedule.startDate))
                .map(({ schedule, status, eventStatus }) => (
                  <EventCard
                    key={schedule.id}
                    schedule={schedule}
                    status={status}
                    eventStatus={eventStatus}
                    to={`/events/${schedule.id}`}
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

function TagFilter({ tags, selected, usedTagSet, onChange, onLongPress }: {
  tags: string[]
  selected: string | null
  usedTagSet: Set<string>
  onChange: (t: string | null) => void
  onLongPress: (t: string) => void
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
      <TagChip label="全て" active={!selected} used onClick={() => onChange(null)} />
      {tags.map(t => (
        <TagChip
          key={t}
          label={t}
          active={selected === t}
          used={usedTagSet.has(t)}
          onClick={() => onChange(selected === t ? null : t)}
          onLongPress={() => onLongPress(t)}
        />
      ))}
    </div>
  )
}

function TagChip({ label, active, used, onClick, onLongPress }: {
  label: string
  active: boolean
  used: boolean
  onClick: () => void
  onLongPress?: () => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggered = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  function cancel() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  return (
    <button
      type="button"
      onClick={() => { if (!triggered.current) onClick() }}
      onPointerDown={onLongPress ? e => {
        triggered.current = false
        startPos.current = { x: e.clientX, y: e.clientY }
        timer.current = setTimeout(() => {
          triggered.current = true
          onLongPress()
        }, 600)
      } : undefined}
      onPointerMove={onLongPress ? e => {
        if (!startPos.current) return
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        if (dx * dx + dy * dy > 64) cancel()
      } : undefined}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
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
        opacity: !active && !used ? 0.55 : 1,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

function TodayTimetables() {
  const { items: timetables } = useTimetables()
  const today = new Date()
  const jsDay = today.getDay()
  const dow = (jsDay === 0 ? null : jsDay) as DayOfWeek | null

  if (dow === null) return null

  const owned = timetables
    .map(t => ({ tt: t, cells: t.cells.filter(c => c.dayOfWeek === dow).sort((a, b) => a.period - b.period) }))
    .filter(x => x.cells.length > 0)

  if (owned.length === 0) return null

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'saturate(160%) blur(22px)',
        WebkitBackdropFilter: 'saturate(160%) blur(22px)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0, 0, 0, 0.05)',
        borderRadius: 27,
        padding: '14px 16px',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--label-secondary)',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
        }}>
          今日の時間割
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {owned.map(({ tt, cells }) => (
            <TodayRow key={tt.id} tt={tt} subjects={cells.map(c => c.subject)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TodayRow({ tt, subjects }: { tt: Timetable; subjects: string[] }) {
  return (
    <Link
      to={`/timetables/${tt.id}`}
      style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)', flexShrink: 0 }}>
        {tt.owner}
      </span>
      <span style={{
        fontSize: 14,
        color: 'var(--label-secondary)',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {subjects.join(' · ')}
      </span>
    </Link>
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
