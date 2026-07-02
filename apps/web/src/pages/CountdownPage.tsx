import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Share2, X, Search } from 'lucide-react'
import type { Schedule, DayOfWeek } from '@famicale/shared'
import { classify, isRecentlyEnded } from '../lib/event-status'
import { TABS, inTab, sortForTab, emptyMessage, type TabId, type Item } from '../lib/event-filters'
import { useSchedules } from '../state/schedules'
import { useTimetables } from '../state/timetables'
import { useLunch } from '../state/lunch'
import AlertDialog from '../components/AlertDialog'
import Chip from '../components/Chip'
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

      <TodayBlock />

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
      <Chip label="全て" active={!selected} onClick={() => onChange(null)} />
      {tags.map(t => (
        <Chip
          key={t}
          label={t}
          active={selected === t}
          muted={selected !== t && !usedTagSet.has(t)}
          onClick={() => onChange(selected === t ? null : t)}
          onLongPress={() => onLongPress(t)}
        />
      ))}
    </div>
  )
}

function TodayBlock() {
  const { items: timetables } = useTimetables()
  const { tables } = useLunch()
  const today = new Date()
  const jsDay = today.getDay()

  if (jsDay === 0) return null

  const dow = jsDay as DayOfWeek
  const owned = timetables
    .map(t => ({ tt: t, cells: t.cells.filter(c => c.dayOfWeek === dow).sort((a, b) => a.period - b.period) }))
    .filter(x => x.cells.length > 0)

  const todayISO = formatISODate(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = formatISODate(tomorrow)
  const multi = tables.length > 1
  const tomorrowMenus = tables.filter(t => t.menus[tomorrowISO])
  // 給食行は平日のみ常設 (献立入力への導線を兼ねる)。 土曜は時間割がある場合だけブロックを出す
  const showLunchRows = jsDay <= 5

  if (owned.length === 0 && !showLunchRows) return null

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
          今日
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {owned.map(({ tt, cells }) => (
            <TodayRow
              key={tt.id}
              to={`/timetables/${tt.id}`}
              label={tt.owner}
              text={cells.map(c => c.subject).join(' · ')}
            />
          ))}
          {showLunchRows && (tables.length === 0 ? (
            <TodayRow to="/lunch" label="給食" />
          ) : (
            tables.map(t => (
              <TodayRow
                key={t.id}
                to="/lunch"
                label={multi ? t.name : '給食'}
                text={t.menus[todayISO]}
              />
            ))
          ))}
          {tomorrowMenus.map(t => (
            <TodayRow
              key={`tomorrow-${t.id}`}
              to="/lunch"
              label={multi ? `明日·${t.name}` : '明日の給食'}
              text={t.menus[tomorrowISO]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TodayRow({ to, label, text }: { to: string; label: string; text?: string }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        textDecoration: 'none', color: 'inherit',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: 14,
        color: text ? 'var(--label-secondary)' : 'var(--label-tertiary)',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {text ?? '未入力'}
      </span>
    </Link>
  )
}

function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
