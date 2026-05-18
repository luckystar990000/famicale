import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  onConfirm?: () => void
  confirmDisabled?: boolean
  children: ReactNode
}

export default function Sheet({
  open,
  onClose,
  title,
  onConfirm,
  confirmDisabled,
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
          background: 'rgba(0, 0, 0, 0.32)',
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
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'saturate(180%) blur(28px)',
          WebkitBackdropFilter: 'saturate(180%) blur(28px)',
          border: '0.5px solid var(--glass-border)',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 -10px 40px rgba(0, 0, 0, 0.18)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 0',
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={circleBtn}
          >
            <X size={18} strokeWidth={2.8} color="var(--label-secondary)" />
          </button>
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              aria-label="保存"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: confirmDisabled
                  ? 'rgba(120, 120, 128, 0.16)'
                  : 'var(--tint)',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: confirmDisabled ? 'not-allowed' : 'pointer',
                boxShadow: confirmDisabled ? 'none' : '0 3px 10px rgba(0, 122, 255, 0.35)',
                padding: 0,
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              <Check
                size={20}
                strokeWidth={3}
                color={confirmDisabled ? 'var(--label-tertiary)' : '#fff'}
              />
            </button>
          ) : <span style={{ width: 34, height: 34 }} />}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
          <h2 style={{
            margin: '4px 0 16px',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--label)',
            letterSpacing: -0.2,
            lineHeight: 1.25,
          }}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

const circleBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  border: '0.5px solid rgba(255, 255, 255, 0.6)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 4px rgba(0, 0, 0, 0.05)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
}
