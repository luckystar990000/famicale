import { TABS, type TabId } from '../lib/event-filters'

export default function SegmentedControl({ value, onChange, counts }: {
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
              background: active ? 'var(--tint)' : 'transparent',
              color: active ? '#fff' : 'var(--label)',
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: active ? '0 1px 4px rgba(0, 122, 255, 0.25)' : 'none',
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
                color: active ? 'rgba(255, 255, 255, 0.85)' : 'var(--label-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}>{counts[id]}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
