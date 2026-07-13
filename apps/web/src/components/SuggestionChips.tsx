// 入力候補チップ。 過去に入力した値 (名前・科目など) をタップで再利用する。
// 名前候補 (TimetablesPage) と科目候補 (TimetablePage) で共用。
interface Props {
  items: string[]
  onPick: (value: string) => void
}

export default function SuggestionChips({ items, onPick }: Props) {
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px', marginTop: 4 }}>
      {items.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            border: '0.5px solid var(--glass-border)',
            background: 'rgba(255, 255, 255, 0.55)',
            color: 'var(--label)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + {v}
        </button>
      ))}
    </div>
  )
}
