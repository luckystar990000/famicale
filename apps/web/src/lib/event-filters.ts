import type { Schedule } from '@famicale/shared'
import { isRecentlyEnded, type EventStatus } from './event-status'

export type TabId = 'all' | 'ongoing' | 'ending' | 'upcoming' | 'starting'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: '全て' },
  { id: 'ongoing', label: '開催中' },
  { id: 'ending', label: '終わりそう' },
  { id: 'upcoming', label: 'まだ' },
  { id: 'starting', label: '始まりそう' },
]

export type Item = { schedule: Schedule; status: EventStatus; eventStatus: EventStatus }

export function inTab(status: EventStatus, tab: TabId): boolean {
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

// 並び/タブ絞り込みは eventStatus (イベント期間 base) を使う。 DESIGN.md 「二軸分離」参照。
export function sortForTab(items: Item[], tab: TabId): Item[] {
  const arr = [...items]
  if (tab === 'all') {
    arr.sort((a, b) => {
      const r = statusRank(a.eventStatus.kind) - statusRank(b.eventStatus.kind)
      if (r !== 0) return r
      const cmp = a.schedule.startDate.localeCompare(b.schedule.startDate)
      return a.eventStatus.kind === 'past' ? -cmp : cmp
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

export function emptyMessage(tab: TabId): string {
  switch (tab) {
    case 'all': return '直近の予定はありません'
    case 'ongoing': return '今開催中のイベントはありません'
    case 'upcoming': return 'これから始まる予定はありません'
    case 'ending': return 'もうすぐ終わるイベントはありません'
    case 'starting': return 'もうすぐ始まる予定はありません'
  }
}
