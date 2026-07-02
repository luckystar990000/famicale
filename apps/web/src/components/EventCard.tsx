import { Link } from 'react-router-dom'
import type { Schedule } from '@famicale/shared'
import Checkbox from './Checkbox'
import {
  statusBadge, statusAccent, gaugeFill, cardHeaderBg, isVisitOutOfRange,
  type EventStatus,
} from '../lib/event-status'

export default function EventCard({ schedule, status, eventStatus, to, onTagClick, onVisited }: {
  schedule: Schedule
  status: EventStatus
  eventStatus: EventStatus
  to?: string
  onTagClick?: (tag: string) => void
  onVisited?: () => void
}) {
  const cancelled = schedule.status === 'cancelled'
  const outOfRange = isVisitOutOfRange(schedule)
  const badge = statusBadge(status, schedule)
  const accent = cancelled
    ? '#9ca3af'
    : outOfRange
      ? '#ff3b30'
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
  // 行く日が過ぎていても会期中なら「行った」を押せる (visit 軸でなく event 軸で判定)
  const canMarkVisited = !!onVisited && !cancelled && !!schedule.visitDate &&
    !schedule.visitedDate && eventStatus.kind !== 'past'

  const cardStyle: React.CSSProperties = {
    marginBottom: 10,
    background: 'var(--bg-card)',
    backdropFilter: 'saturate(160%) blur(22px)',
    WebkitBackdropFilter: 'saturate(160%) blur(22px)',
    border: outOfRange ? '1.5px solid rgba(255, 59, 48, 0.6)' : '0.5px solid var(--glass-border)',
    boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 18px rgba(0, 0, 0, 0.06)',
    borderRadius: 27,
    overflow: 'hidden',
    opacity: cancelled ? 0.55 : 1,
  }

  const content = (
    <>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '12px 16px',
        background: cardHeaderBg(eventStatus, cancelled, outOfRange),
      }}>
        {canMarkVisited && (
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onVisited?.()
            }}
            aria-label="行ったことにする"
            style={{
              border: 'none',
              background: 'transparent',
              padding: 6,
              margin: '-6px 0 -6px -6px',
              display: 'inline-flex',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Checkbox checked={false} />
          </button>
        )}
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
        {!cancelled && schedule.visitedDate ? (
          <span
            className="event-badge"
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
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>行った</span>
            <span>{formatMD(schedule.visitedDate)}</span>
          </span>
        ) : !cancelled && schedule.visitDate ? (
          <span
            className={`event-badge${isSoon ? ' badge-pulse' : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: outOfRange ? 'rgba(255, 59, 48, 0.16)' : 'rgba(175, 82, 222, 0.16)',
              color: outOfRange ? 'var(--destructive)' : '#af52de',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>行く日</span>
            <span>{formatMD(schedule.visitDate)}</span>
            {outOfRange ? (
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>終了後</span>
            ) : countdownTail(status) && (
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
      <div style={{
        padding: '10px 16px',
        background: outOfRange ? 'rgba(255, 59, 48, 0.04)' : undefined,
      }}>
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
          {formatTimeRange(schedule.startTime, schedule.endTime) && (
            <span style={{ color: 'var(--label-tertiary)', marginLeft: 6, fontWeight: 400 }}>
              {formatTimeRange(schedule.startTime, schedule.endTime)}
            </span>
          )}
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
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          padding: '0 16px 12px',
          background: outOfRange ? 'rgba(255, 59, 48, 0.04)' : undefined,
        }}>
          {schedule.tags.map(t => onTagClick ? (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onTagClick(t)
              }}
              style={{ ...tagChipStyle, border: 'none', cursor: 'pointer' }}
            >
              {t}
            </button>
          ) : (
            <span key={t} style={tagChipStyle}>{t}</span>
          ))}
        </div>
      )}
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="press-feedback"
        style={{ display: 'block', textDecoration: 'none', color: 'inherit', ...cardStyle }}
      >
        {content}
      </Link>
    )
  }
  return <div style={cardStyle}>{content}</div>
}

const tagChipStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(0, 122, 255, 0.12)',
  color: 'var(--tint)',
  fontSize: 11,
  fontWeight: 500,
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

function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return ''
  if (start && end) return `(${start}〜${end})`
  if (start) return `(${start}〜)`
  return `(〜${end})`
}
