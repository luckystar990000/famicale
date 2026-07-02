import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, X, Check, Pencil, Plus } from 'lucide-react'

interface BackProps {
  to?: string
  label?: string
  icon?: 'chevron' | 'close'
}

interface ActionProps {
  label: string
  onClick: () => void
  primary?: boolean
  destructive?: boolean
  disabled?: boolean
  icon?: 'check' | 'pencil' | 'plus'
}

// check 以外のアイコンアクションは戻るボタンと同系のガラス円形で描く
const ACTION_ICONS = { pencil: Pencil, plus: Plus } as const

interface Props {
  title?: string
  back?: BackProps
  rightAction?: ActionProps
  inline?: boolean
}

export default function NavBar({ title, back, rightAction, inline }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  function handleBack() {
    // 履歴があれば戻る (= POP → スクロール位置復元)、 直接 URL アクセス時のみ to へ
    if (location.key !== 'default') {
      navigate(-1)
    } else if (back?.to) {
      navigate(back.to)
    } else {
      navigate(-1)
    }
  }

  return (
    <div style={{
      position: inline ? 'relative' : 'sticky',
      top: 0,
      zIndex: 20,
      paddingTop: 'env(safe-area-inset-top)',
      background: 'rgba(255, 255, 255, 0.65)',
    }}>
      <div style={{
        height: 60,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
      }}>
        <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
          {back && (
            <button
              type="button"
              onClick={handleBack}
              aria-label={back.label ?? '戻る'}
              style={circleBtn}
            >
              {back.icon === 'close' ? (
                <X size={22} strokeWidth={2.8} color="var(--label-secondary)" />
              ) : (
                <ChevronLeft size={26} strokeWidth={2.5} color="var(--label)" />
              )}
            </button>
          )}
        </div>

        <div style={{
          justifySelf: 'center',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--label)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '60vw',
        }}>
          {title}
        </div>

        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
          {rightAction && (
            rightAction.icon === 'check' ? (
              <button
                type="button"
                onClick={rightAction.onClick}
                disabled={rightAction.disabled}
                aria-label={rightAction.label}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: rightAction.disabled
                    ? 'rgba(120, 120, 128, 0.16)'
                    : 'var(--tint)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: rightAction.disabled ? 'not-allowed' : 'pointer',
                  boxShadow: rightAction.disabled ? 'none' : '0 3px 10px rgba(0, 122, 255, 0.35)',
                  padding: 0,
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
              >
                <Check
                  size={24}
                  strokeWidth={3}
                  color={rightAction.disabled ? 'var(--label-tertiary)' : '#fff'}
                />
              </button>
            ) : rightAction.icon ? (
              <button
                type="button"
                onClick={rightAction.onClick}
                disabled={rightAction.disabled}
                aria-label={rightAction.label}
                style={{
                  ...circleBtn,
                  opacity: rightAction.disabled ? 0.55 : 1,
                  cursor: rightAction.disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {(() => {
                  const Icon = ACTION_ICONS[rightAction.icon]
                  return <Icon size={rightAction.icon === 'plus' ? 22 : 19} strokeWidth={2.2} color="var(--label)" />
                })()}
              </button>
            ) : (
              <button
                type="button"
                onClick={rightAction.onClick}
                disabled={rightAction.disabled}
                style={{
                  ...pillBtn,
                  color: rightAction.destructive
                    ? 'var(--destructive)'
                    : rightAction.disabled
                      ? 'var(--label-tertiary)'
                      : rightAction.primary ? 'var(--tint)' : 'var(--label)',
                  fontWeight: rightAction.primary ? 600 : 500,
                  opacity: rightAction.disabled ? 0.55 : 1,
                  cursor: rightAction.disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {rightAction.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

const circleBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  border: '0.5px solid rgba(255, 255, 255, 0.6)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 4px rgba(0, 0, 0, 0.05)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--label)',
  padding: 0,
  cursor: 'pointer',
  fontWeight: 500,
}

const pillBtn: React.CSSProperties = {
  height: 44,
  padding: '0 20px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  border: '0.5px solid rgba(255, 255, 255, 0.6)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 4px rgba(0, 0, 0, 0.05)',
  fontSize: 15,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}
