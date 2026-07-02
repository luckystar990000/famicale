import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Lock, Eye } from 'lucide-react'
import { classify, isRecentlyEnded } from '../lib/event-status'
import { TABS, inTab, sortForTab, emptyMessage, type TabId, type Item } from '../lib/event-filters'
import EventCard from '../components/EventCard'
import SegmentedControl from '../components/SegmentedControl'
import { useSchedules } from '../state/schedules'
import { useShare } from '../state/share'

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
