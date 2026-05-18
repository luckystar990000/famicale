import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function AlertDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'キャンセル',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
    >
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.28)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          borderRadius: 27,
          background: 'rgba(245, 245, 245, 0.72)',
          backdropFilter: 'saturate(180%) blur(32px)',
          WebkitBackdropFilter: 'saturate(180%) blur(32px)',
          border: '0.5px solid var(--glass-border)',
          boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 24px 60px rgba(0, 0, 0, 0.22)',
          padding: 16,
        }}
      >
        <div style={{ padding: '12px 8px 18px', textAlign: 'left' }}>
          <div
            id="alert-title"
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--label)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {message && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: 'var(--label-secondary)',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="press-feedback"
            style={pillButtonStyle({ bold: false, color: 'var(--label)' })}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="press-feedback"
            style={pillButtonStyle({
              bold: true,
              color: destructive ? 'var(--destructive)' : 'var(--tint)',
            })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function pillButtonStyle({ bold, color }: { bold: boolean; color: string }): React.CSSProperties {
  return {
    minHeight: 50,
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'saturate(180%) blur(14px)',
    WebkitBackdropFilter: 'saturate(180%) blur(14px)',
    border: '0.5px solid var(--glass-border)',
    boxShadow: 'inset 0 1px 0 var(--glass-inner-hi)',
    borderRadius: 999,
    color,
    fontSize: 17,
    fontWeight: bold ? 600 : 400,
    cursor: 'pointer',
    width: '100%',
  }
}
