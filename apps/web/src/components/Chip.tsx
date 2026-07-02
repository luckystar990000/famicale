import { useRef } from 'react'

// フィルタ/セレクタ用ピルチップ。 onLongPress (600ms) は管理系アクション用 (タグ削除 / 献立表編集)。
export default function Chip({ label, active, muted, onClick, onLongPress }: {
  label: string
  active: boolean
  muted?: boolean
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
        opacity: muted ? 0.55 : 1,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}
