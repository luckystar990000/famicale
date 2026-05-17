import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  onConfirm?: () => void
  confirmDisabled?: boolean
  confirmLabel?: string
  children: ReactNode
}

export default function Sheet({
  open,
  onClose,
  title,
  onConfirm,
  confirmDisabled,
  confirmLabel = '保存',
  children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--bg-grouped)',
          borderRadius: '16px 16px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '12px 12px',
          gap: 8,
          borderBottom: '0.5px solid var(--separator)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              justifySelf: 'start',
              padding: '6px 12px',
              border: 'none',
              background: 'transparent',
              color: 'var(--tint)',
              fontSize: 16,
              fontWeight: 400,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--label)' }}>{title}</span>
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              style={{
                justifySelf: 'end',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                color: confirmDisabled ? 'var(--label-tertiary)' : 'var(--tint)',
                fontSize: 16,
                fontWeight: 600,
                cursor: confirmDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {confirmLabel}
            </button>
          ) : <span />}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
