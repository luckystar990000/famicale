import type { ReactNode, CSSProperties } from 'react'

interface SectionProps {
  header?: string
  footer?: ReactNode
  children: ReactNode
  style?: CSSProperties
}

export function ListSection({ header, footer, children, style }: SectionProps) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {header && (
        <div style={{
          padding: '0 20px 8px',
          fontSize: 15,
          color: 'var(--label-secondary)',
          fontWeight: 500,
        }}>
          {header}
        </div>
      )}
      <div className="ios-list" style={{
        background: 'var(--bg-card)',
        backdropFilter: 'saturate(160%) blur(22px)',
        WebkitBackdropFilter: 'saturate(160%) blur(22px)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0, 0, 0, 0.05)',
        borderRadius: 27,
        overflow: 'hidden',
        margin: '0 16px',
      }}>
        {children}
      </div>
      {footer && (
        <div style={{
          padding: '8px 20px 0',
          fontSize: 13,
          color: 'var(--label-secondary)',
          lineHeight: 1.4,
        }}>
          {footer}
        </div>
      )}
    </div>
  )
}

interface RowProps {
  label?: ReactNode
  value?: ReactNode
  children?: ReactNode
  onClick?: () => void
  trailing?: ReactNode
  destructive?: boolean
  disabled?: boolean
  align?: 'horizontal' | 'vertical'
  className?: string
}

export function ListRow({ label, value, children, onClick, trailing, destructive, disabled, align = 'horizontal', className }: RowProps) {
  const interactive = !!onClick && !disabled
  const baseStyle: CSSProperties = {
    minHeight: 54,
    padding: '14px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: align === 'horizontal' ? 'center' : 'stretch',
    flexDirection: align === 'horizontal' ? 'row' : 'column',
    gap: align === 'horizontal' ? 12 : 6,
    cursor: interactive ? 'pointer' : 'default',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
    color: destructive ? 'var(--destructive)' : 'var(--label)',
    fontSize: 17,
    fontWeight: 400,
    border: 0,
    borderRadius: 0,
    overflow: 'hidden',
    opacity: disabled ? 0.4 : 1,
    transition: 'opacity 180ms ease',
  }

  const inner = (
    <>
      {align === 'horizontal' ? (
        <>
          {label !== undefined && (
            <span style={{ color: destructive ? 'var(--destructive)' : 'var(--label)', flexShrink: 0 }}>
              {label}
            </span>
          )}
          {(value !== undefined || children) && (
            <span style={{
              marginLeft: label !== undefined ? 'auto' : 0,
              color: destructive ? 'var(--destructive)' : 'var(--label-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
              flex: label !== undefined ? '0 1 auto' : 1,
            }}>
              {children ?? value}
            </span>
          )}
          {trailing && <span style={{ marginLeft: 'auto', color: 'var(--label-tertiary)', flexShrink: 0 }}>{trailing}</span>}
        </>
      ) : (
        <>
          {label !== undefined && (
            <span style={{ fontSize: 13, color: 'var(--label-secondary)', fontWeight: 400 }}>{label}</span>
          )}
          {children ?? value}
        </>
      )}
    </>
  )

  if (onClick) {
    const buttonClass = [
      disabled ? undefined : 'press-feedback',
      className,
    ].filter(Boolean).join(' ') || undefined
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}
        style={baseStyle}
      >
        {inner}
      </button>
    )
  }

  return <div className={className} style={baseStyle}>{inner}</div>
}
