import type { Schedule } from '@famicale/shared'

export type EventStatus =
  | { kind: 'upcoming-soon'; daysUntilStart: number }
  | { kind: 'upcoming'; daysUntilStart: number }
  | { kind: 'ongoing-today' }
  | { kind: 'ongoing'; daysUntilEnd: number }
  | { kind: 'ending-soon'; daysUntilEnd: number }
  | { kind: 'past'; daysSinceEnd: number }

const SOON_DAYS = 3
export const HOME_PAST_RETENTION_DAYS = 7

export function isRecentlyEnded(status: EventStatus): boolean {
  return status.kind === 'past' && status.daysSinceEnd <= HOME_PAST_RETENTION_DAYS
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / 86400000)
}

export function effectiveStart(schedule: Schedule): string {
  return schedule.visitDate ?? schedule.startDate
}

export function effectiveEnd(schedule: Schedule): string | undefined {
  return schedule.visitDate ? undefined : schedule.endDate
}

export function classify(schedule: Schedule, today = new Date(), opts: { ignoreVisitDate?: boolean } = {}): EventStatus {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // 「行った」記録があれば自分軸で終了扱い。 会期が続いていても past 側へ寄せる
  // (並び/グルーピング軸 = ignoreVisitDate 側も含めて上書きする)
  if (schedule.visitedDate) {
    return { kind: 'past', daysSinceEnd: Math.max(0, diffDays(toDate(schedule.visitedDate), t)) }
  }

  const startStr = opts.ignoreVisitDate ? schedule.startDate : effectiveStart(schedule)
  const endStr = opts.ignoreVisitDate ? schedule.endDate : effectiveEnd(schedule)
  const start = toDate(startStr)
  const end = endStr ? toDate(endStr) : null

  const daysUntilStart = diffDays(t, start)
  const daysUntilEnd = end ? diffDays(t, end) : null

  if (end ? daysUntilEnd! < 0 : daysUntilStart < 0) {
    const daysSinceEnd = end ? -daysUntilEnd! : -daysUntilStart
    return { kind: 'past', daysSinceEnd }
  }

  if (daysUntilStart <= 0) {
    if (!end) return { kind: 'ongoing-today' }
    if (daysUntilEnd! <= SOON_DAYS) return { kind: 'ending-soon', daysUntilEnd: daysUntilEnd! }
    return { kind: 'ongoing', daysUntilEnd: daysUntilEnd! }
  }

  if (daysUntilStart <= SOON_DAYS) {
    return { kind: 'upcoming-soon', daysUntilStart }
  }
  return { kind: 'upcoming', daysUntilStart }
}

const BIRTHDAY_TAG = '誕生日'

export function isBirthdayEvent(schedule: Schedule): boolean {
  return schedule.tags?.includes(BIRTHDAY_TAG) ?? false
}

export function statusBadge(status: EventStatus, schedule: Schedule): { label: string; color: string; bg: string } {
  const untilLabel = schedule.visitDate
    ? '行くまで'
    : isBirthdayEvent(schedule) ? '誕生日まで' : '開始まで'
  switch (status.kind) {
    case 'upcoming-soon':
      return { label: `${untilLabel}${status.daysUntilStart}日`, color: '#1e40af', bg: '#dbeafe' }
    case 'upcoming':
      return { label: `${untilLabel}${status.daysUntilStart}日`, color: '#92400e', bg: '#fef3c7' }
    case 'ongoing-today':
      return { label: '今日', color: '#065f46', bg: '#d1fae5' }
    case 'ongoing':
      return { label: `終了まで${status.daysUntilEnd}日`, color: '#065f46', bg: '#d1fae5' }
    case 'ending-soon':
      return {
        label: status.daysUntilEnd === 0 ? '本日終了' : `終了まで${status.daysUntilEnd}日`,
        color: '#991b1b',
        bg: '#fee2e2',
      }
    case 'past':
      return {
        label: status.daysSinceEnd === 1 ? '昨日終了' : `${status.daysSinceEnd}日前に終了`,
        color: '#6b7280',
        bg: '#f3f4f6',
      }
  }
}

export function statusAccent(status: EventStatus): string {
  switch (status.kind) {
    case 'upcoming-soon': return '#f59e0b'
    case 'upcoming': return '#f59e0b'
    case 'ongoing-today': return '#10b981'
    case 'ongoing': return '#10b981'
    case 'ending-soon': return '#10b981'
    case 'past': return '#d1d5db'
  }
}

export function cardHeaderBg(status: EventStatus, cancelled: boolean, outOfRange = false): string {
  if (outOfRange) return 'rgba(255, 59, 48, 0.08)'
  if (cancelled) return 'rgba(156, 163, 175, 0.06)'
  switch (status.kind) {
    case 'ongoing-today':
    case 'ongoing':
    case 'ending-soon':
      return 'rgba(16, 185, 129, 0.06)'
    case 'upcoming-soon':
    case 'upcoming':
      return 'rgba(245, 158, 11, 0.06)'
    case 'past':
      return 'rgba(156, 163, 175, 0.06)'
  }
}

export function isVisitOutOfRange(schedule: Schedule): boolean {
  // 行った記録があれば行く日は過去の話なので警告しない
  if (!schedule.visitDate || schedule.visitedDate) return false
  if (schedule.endDate) return schedule.visitDate > schedule.endDate
  return schedule.visitDate > schedule.startDate
}

export function sortKey(schedule: Schedule, status: EventStatus): [number, number] {
  const eff = toDate(effectiveStart(schedule)).getTime()
  if (status.kind === 'past') return [2, -eff]
  return [0, eff]
}

const GAUGE_WINDOW_DAYS = 30

export interface Gauge {
  fill: number
  fillFrom: 'left' | 'right'
}

export function gaugeFill(schedule: Schedule, status: EventStatus, today = new Date()): Gauge | null {
  if (status.kind === 'past') return null
  if (status.kind === 'ongoing-today') return { fill: 1, fillFrom: 'left' }

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = toDate(effectiveStart(schedule))
  const effEnd = effectiveEnd(schedule)
  const end = effEnd ? toDate(effEnd) : null

  if ((status.kind === 'ongoing' || status.kind === 'ending-soon') && end) {
    const total = diffDays(start, end) + 1
    const remaining = diffDays(t, end) + 1
    return { fill: clamp(remaining / total, 0, 1), fillFrom: 'left' }
  }

  const daysUntilStart = diffDays(t, start)
  return {
    fill: clamp(1 - daysUntilStart / GAUGE_WINDOW_DAYS, 0, 1),
    fillFrom: 'right',
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
