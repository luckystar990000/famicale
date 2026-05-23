import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { ListSection, ListRow } from './List'

export interface FormValues {
  title: string
  startDate: string
  endDate: string
  tags: string[]
  notes: string
}

interface Props {
  values: FormValues
  onChange: (patch: Partial<FormValues>) => void
  knownTags?: string[]
}

export default function EventForm({ values, onChange, knownTags }: Props) {
  const endDateInvalid = values.endDate !== '' && values.endDate < values.startDate
  const [tagSectionOpen, setTagSectionOpen] = useState(values.tags.length > 0)

  return (
    <>
      <ListSection>
        <ListRow>
          <input
            type="text"
            value={values.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="イベント名"
            autoFocus
            style={inlineInputStyle}
          />
        </ListRow>
      </ListSection>

      <ListSection footer={endDateInvalid ? '終了日は開始日以降にしてください' : undefined}>
        <ListRow label="開始日">
          <input
            type="date"
            value={values.startDate}
            onChange={e => onChange({ startDate: e.target.value })}
            style={inlineDateInputStyle}
          />
        </ListRow>
        {values.endDate !== '' ? (
          <ListRow label="終了日">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
              <input
                type="date"
                value={values.endDate}
                onChange={e => onChange({ endDate: e.target.value })}
                min={values.startDate || undefined}
                style={{
                  ...inlineDateInputStyle,
                  paddingRight: 32,
                }}
              />
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  onChange({ endDate: '' })
                }}
                aria-label="終了日をクリア"
                style={{
                  position: 'absolute',
                  right: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(120, 120, 128, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} strokeWidth={3} color="#fff" />
              </button>
            </div>
          </ListRow>
        ) : (
          <ListRow onClick={() => onChange({ endDate: values.startDate })}>
            <span style={{ color: 'var(--tint)', fontWeight: 500 }}>
              + 終了日を追加
            </span>
          </ListRow>
        )}
      </ListSection>

      {tagSectionOpen ? (
        <ListSection header="タグ">
          <ListRow align="vertical">
            <TagInput
              value={values.tags}
              onChange={tags => onChange({ tags })}
              knownTags={knownTags}
            />
          </ListRow>
        </ListSection>
      ) : (
        <ListSection>
          <ListRow onClick={() => setTagSectionOpen(true)}>
            <span style={{ color: 'var(--tint)', fontWeight: 500 }}>
              + タグを追加
            </span>
          </ListRow>
        </ListSection>
      )}

      <ListSection>
        <ListRow align="vertical">
          <textarea
            value={values.notes}
            onChange={e => onChange({ notes: e.target.value })}
            placeholder="メモ (任意)"
            rows={4}
            style={inlineTextareaStyle}
          />
        </ListRow>
      </ListSection>
    </>
  )
}

function TagInput({ value, onChange, knownTags }: {
  value: string[]
  onChange: (tags: string[]) => void
  knownTags?: string[]
}) {
  const [input, setInput] = useState('')

  function addTag(t: string) {
    const trimmed = t.trim()
    if (!trimmed || value.includes(trimmed)) {
      setInput('')
      return
    }
    onChange([...value, trimmed])
    setInput('')
  }

  function removeTag(t: string) {
    onChange(value.filter(x => x !== t))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
  }

  const suggestions = (knownTags ?? []).filter(t => !value.includes(t))

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {value.map(t => (
            <span key={t} style={chipStyle}>
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`${t} を削除`}
                style={chipRemoveStyle}
              >
                <X size={11} strokeWidth={3} color="var(--label-secondary)" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input.trim() && addTag(input)}
        placeholder="タグを追加 (Enter or , で確定)"
        style={inlineInputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              style={suggestionChipStyle}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 6px 4px 10px',
  borderRadius: 999,
  background: 'rgba(0, 122, 255, 0.12)',
  color: 'var(--tint)',
  fontSize: 13,
  fontWeight: 500,
}

const chipRemoveStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  background: 'rgba(120, 120, 128, 0.18)',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

const suggestionChipStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 999,
  background: 'transparent',
  border: '0.5px solid var(--separator)',
  color: 'var(--label-secondary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
}

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 17,
  padding: 0,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--label)',
  lineHeight: 1.3,
  WebkitAppearance: 'none',
  appearance: 'none',
}

const inlineDateInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 17,
  padding: 0,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--label)',
  lineHeight: 1.3,
  textAlign: 'left',
}

const inlineTextareaStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  fontSize: 17,
  padding: 0,
  outline: 'none',
  fontFamily: 'inherit',
  color: 'var(--label)',
  resize: 'none',
  lineHeight: 1.4,
}
