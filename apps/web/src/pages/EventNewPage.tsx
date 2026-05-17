import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventForm, { type FormValues } from '../components/EventForm'
import NavBar from '../components/NavBar'
import { useSchedules } from '../state/schedules'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EventNewPage() {
  const navigate = useNavigate()
  const { create, items } = useSchedules()
  const knownTags = useMemo(
    () => Array.from(new Set(items.flatMap(s => s.tags ?? []))).sort(),
    [items]
  )
  const [values, setValues] = useState<FormValues>({
    title: '', startDate: todayIso(), endDate: '', tags: [], notes: '',
  })

  const endDateInvalid = values.endDate !== '' && values.endDate < values.startDate
  const canSubmit = values.title.trim() !== '' && values.startDate !== '' && !endDateInvalid

  function handleSubmit() {
    if (!canSubmit) return
    create({
      title: values.title.trim(),
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      tags: values.tags,
      notes: values.notes.trim() || undefined,
    })
    navigate('/', { replace: true })
  }

  return (
    <>
      <NavBar
        title="新規イベント"
        back={{ icon: 'close', label: 'キャンセル', to: '/' }}
        rightAction={{ icon: 'check', label: '追加', primary: true, disabled: !canSubmit, onClick: handleSubmit }}
      />
      <div style={{ paddingTop: 16 }}>
        <EventForm
          values={values}
          onChange={patch => setValues(v => ({ ...v, ...patch }))}
          knownTags={knownTags}
        />
        {!canSubmit && (
          <div style={{
            padding: '8px 20px 0',
            fontSize: 13,
            color: 'var(--label-secondary)',
            textAlign: 'center',
          }}>
            {values.title.trim() === ''
              ? 'イベント名を入力すると「追加」が押せます'
              : '入力内容を確認してください'}
          </div>
        )}
      </div>
    </>
  )
}
