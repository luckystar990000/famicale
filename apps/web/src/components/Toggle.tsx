// iOS 設定風トグルスイッチ (ネイティブ寸法 51×31 / つまみ 27)。
interface Props {
  on: boolean
  onChange: () => void
  disabled?: boolean
}

export default function Toggle({ on, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 51,
        height: 31,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        background: on ? 'var(--tint)' : 'rgba(120, 120, 128, 0.32)',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: 27,
          height: 27,
          borderRadius: 999,
          background: '#fff',
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      />
    </button>
  )
}
