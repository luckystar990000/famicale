import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye } from 'lucide-react'
import type { Schedule } from '@famicale/shared'
import {
  classify, statusBadge, statusAccent, gaugeFill, isRecentlyEnded,
  effectiveStart, effectiveEnd, cardHeaderBg,
  type EventStatus,
} from '../lib/event-status'
import { useSchedules } from '../state/schedules'
import { useShare } from '../state/share'

type TabId = 'all' | 'ongoing' | 'ending' | 'upcoming' | 'starting'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: '全て' },
  { id: 'ongoing', label: '開催中' },
  { id: 'ending', label: '終わりそう' },
  { id: 'upcoming', label: 'まだ' },
  { id: 'starting', label: '始まりそう' },
]

type Item = { schedule: Schedule; status: EventStatus; eventStatus: EventStatus }

function inTab(status: EventStatus, tab: TabId): boolean {
  const kind = status.kind
  if (tab === 'all') return kind !== 'past' || isRecentlyEnded(status)
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
      const cmp = effectiveStart(a.schedule).localeCompare(effectiveStart(b.schedule))
      return a.status.kind === 'past' ? -cmp : cmp
    })
  } else if (tab === 'ongoing' || tab === 'ending') {
    arr.sort((a, b) => {
      const ae = effectiveEnd(a.schedule) ?? effectiveStart(a.schedule)
      const be = effectiveEnd(b.schedule) ?? effectiveStart(b.schedule)
      return ae.localeCompare(be)
    })
  } else if (tab === 'upcoming' || tab === 'starting') {
    arr.sort((a, b) => effectiveStart(a.schedule).localeCompare(effectiveStart(b.schedule)))
  }
  return arr
}

export default function ViewerPage() {
  const { token } = useParams<{ token: string }>()
  const { isValidToken } = useShare()
  const { items } = useSchedules()
  const [tab, setTab] = useState<TabId>('all')

  const valid = token ? isValidToken(token) : false

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
    const filtered = active.filter(i => inTab(i.eventStatus, tab))
    return sortForTab(filtered, tab)
  }, [active, tab])

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, ongoing: 0, upcoming: 0, ending: 0, starting: 0 }
    for (const i of active) {
      for (const t of TABS) {
        if (inTab(i.eventStatus, t.id)) c[t.id]++
      }
    }
    return c
  }, [active])

  if (!valid) {
    return (
      <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72,
            margin: '0 auto 20px',
            borderRadius: 27,
            background: 'rgba(255, 59, 48, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Lock size={32} strokeWidth={2.2} color="var(--destructive)" />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--label)' }}>
            このリンクは無効です
          </h1>
          <p style={{ margin: '12px 0 0', color: 'var(--label-secondary)', fontSize: 14, lineHeight: 1.5 }}>
            共有 URL が無効化されたか、URL が間違っている可能性があります。
            <br />家族の方に最新のリンクを聞いてください。
          </p>
        </div>
      </div>
    )
  }

  const showClosed = tab === 'all' && closed.length > 0

  return (
    <div style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      minHeight: '100dvh',
    }}>
      <div style={{ padding: '12px 20px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--label-secondary)', marginBottom: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px',
            background: 'rgba(120, 120, 128, 0.16)',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--label-secondary)',
          }}>
            <Eye size={12} strokeWidth={2.2} />
            閲覧モード
          </span>
          <span>今日 {dateText}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--label)', letterSpacing: -0.5 }}>
          ファミカレ
        </h1>
      </div>

      <div style={{ padding: '0 16px' }}>
        <SegmentedControl value={tab} onChange={setTab} counts={counts} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {visible.length === 0 && (
          <p style={{ color: 'var(--label-secondary)', textAlign: 'center', marginTop: 32, fontSize: 15 }}>
            {emptyMessage(tab)}
          </p>
        )}

        {visible.map(({ schedule, status, eventStatus }) => (
          <EventCard key={schedule.id} schedule={schedule} status={status} eventStatus={eventStatus} />
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
                  <EventCard key={schedule.id} schedule={schedule} status={status} eventStatus={eventStatus} />
                ))}
            </div>
          </details>
        )}
      </div>
    </div>
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

function EventCard({ schedule, status, eventStatus }: { schedule: Schedule; status: EventStatus; eventStatus: EventStatus }) {
  const cancelled = schedule.status === 'cancelled'
  const badge = statusBadge(status, schedule)
  const accent = cancelled
    ? '#9ca3af'
    : status.kind === 'past'
      ? '#9ca3af'
      : statusAccent(status)
  const gauge = cancelled ? null : gaugeFill(schedule, status)
  const isOngoing = status.kind === 'ongoing' || status.kind === 'ending-soon' || status.kind === 'ongoing-today'
  const dateText = formatDateLabel(schedule, status)
  const isSoon = !cancelled && (status.kind === 'upcoming-soon' || status.kind === 'ending-soon')
  const isPast = !cancelled && status.kind === 'past'
  const titleColor = isPast ? 'var(--label-secondary)' : 'var(--label)'
  const dateColor = isPast ? 'var(--label-secondary)' : 'var(--label)'
  const subTextColor = isPast ? 'var(--label-tertiary)' : 'var(--label-secondary)'

  return (
    <div
      style={{
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
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '12px 16px',
        background: cardHeaderBg(eventStatus, cancelled),
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 16, fontWeight: 600, color: titleColor,
          textDecoration: cancelled ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {schedule.title}
        </div>
        {!cancelled && schedule.visitDate ? (
          <span
            className={`event-badge${isSoon ? ' badge-pulse' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(175, 82, 222, 0.16)',
              color: '#af52de',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>行く日</span>
            <span>{formatMD(schedule.visitDate)}</span>
            {countdownTail(status) && (
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{countdownTail(status)}</span>
            )}
          </span>
        ) : (
          <div
            className={`event-badge${isSoon ? ' badge-pulse' : ''}`}
            style={{
              padding: '4px 10px', borderRadius: 999,
              background: cancelled ? '#fee2e2' : badge.bg,
              color: cancelled ? '#991b1b' : badge.color,
              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cancelled ? '中止' : badge.label}
          </div>
        )}
      </div>

      {gauge ? (
        <div
          role="progressbar"
          aria-label={isOngoing ? '残り期間' : '開始まで'}
          aria-valuenow={Math.round(gauge.fill * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 4, background: 'rgba(0,0,0,0.05)', position: 'relative' }}
        >
          <div
            className="gauge-flow"
            style={{
              position: 'absolute',
              [gauge.fillFrom]: 0,
              top: 0, bottom: 0,
              width: `${gauge.fill * 100}%`,
              backgroundColor: accent,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      ) : (
        <div style={{ height: 4, background: 'rgba(0,0,0,0.05)' }} aria-hidden />
      )}

      {/* Body */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{
          fontSize: 14, color: dateColor, fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {schedule.visitDate
            ? (schedule.endDate
              ? `${formatMD(schedule.startDate)} 〜 ${formatMD(schedule.endDate)}`
              : formatMD(schedule.startDate))
            : dateText}
        </div>
        {schedule.notes && (
          <div style={{
            fontSize: 13,
            color: subTextColor,
            marginTop: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}>
            {schedule.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      {schedule.tags && schedule.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 16px 12px' }}>
          {schedule.tags.map(t => (
            <span key={t} style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(0, 122, 255, 0.12)',
              color: 'var(--tint)',
              fontSize: 11,
              fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function countdownTail(status: EventStatus): string {
  switch (status.kind) {
    case 'upcoming-soon':
    case 'upcoming':
      return `あと${status.daysUntilStart}日`
    case 'ongoing-today':
      return '今日'
    case 'past':
      if (status.daysSinceEnd === 1) return '昨日'
      return `${status.daysSinceEnd}日前`
    case 'ongoing':
    case 'ending-soon':
      return ''
  }
}

function formatDateLabel(schedule: Schedule, status: EventStatus): string {
  if (schedule.status === 'cancelled') {
    if (!schedule.endDate || schedule.endDate === schedule.startDate) return formatMD(schedule.startDate)
    return `${formatMD(schedule.startDate)} 〜 ${formatMD(schedule.endDate)}`
  }
  if (schedule.visitDate) return formatMD(schedule.visitDate)
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
