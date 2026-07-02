import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Action {
  label: string
  onClick: () => void
}

// 役割ごとのトーン。 色はバッジと同じペア (開催中緑 / 中止赤) を使う。 ここ以外で toast の色を定義しない
export type ToastTone = 'neutral' | 'success' | 'destructive'

const TOAST_TONE: Record<ToastTone, { bg: string; color: string }> = {
  neutral: { bg: 'rgba(245, 245, 245, 0.72)', color: 'var(--label)' },
  success: { bg: 'rgba(209, 250, 229, 0.78)', color: '#065f46' },
  destructive: { bg: 'rgba(254, 226, 226, 0.78)', color: '#991b1b' },
}

interface Props {
  open: boolean
  message: string
  durationMs?: number
  action?: Action
  tone?: ToastTone
  onClose: () => void
}

export default function Toast({ open, message, durationMs = 1400, action, tone = 'neutral', onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const inId = window.setTimeout(() => setVisible(true), 10)
    const outId = window.setTimeout(() => setVisible(false), durationMs - 200)
    const endId = window.setTimeout(() => onClose(), durationMs)
    return () => {
      window.clearTimeout(inId)
      window.clearTimeout(outId)
      window.clearTimeout(endId)
    }
  }, [open, durationMs, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 96px)',
        zIndex: 250,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: action ? 'space-between' : 'center',
          gap: 4,
          padding: action ? '8px 8px 8px 20px' : '12px 20px',
          borderRadius: 999,
          background: TOAST_TONE[tone].bg,
          color: TOAST_TONE[tone].color,
          fontSize: 15,
          fontWeight: 500,
          backdropFilter: 'saturate(180%) blur(32px)',
          WebkitBackdropFilter: 'saturate(180%) blur(32px)',
          border: '0.5px solid var(--glass-border)',
          boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 18px 44px rgba(0, 0, 0, 0.18)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 180ms ease, transform 180ms ease',
          pointerEvents: 'auto',
        }}
      >
        <span>{message}</span>
        {action && (
          <button
            type="button"
            onClick={() => { action.onClick(); onClose() }}
            className="press-feedback"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--tint)',
              fontSize: 15,
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
