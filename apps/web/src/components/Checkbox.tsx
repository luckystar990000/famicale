import { Check } from 'lucide-react'

export default function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 999,
      border: `2px solid ${checked ? 'var(--tint)' : 'rgba(60,60,67,0.3)'}`,
      background: checked ? 'var(--tint)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {checked && <Check size={13} strokeWidth={3.5} color="#fff" />}
    </div>
  )
}
