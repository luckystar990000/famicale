import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EventForm, { type FormValues } from '../components/EventForm'
import NavBar from '../components/NavBar'
import { useSchedules } from '../state/schedules'

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { byId, update, items } = useSchedules()
  const schedule = id ? byId(id) : undefined

  const knownTags = useMemo(
    () => Array.from(new Set(items.flatMap(s => s.tags ?? []))).sort(),
    [items]
  )

  const [values, setValues] = useState<FormValues>(() => ({
    title: schedule?.title ?? '',
    startDate: schedule?.startDate ?? '',
    endDate: schedule?.endDate ?? '',
    tags: schedule?.tags ?? [],
    notes: schedule?.notes ?? '',
  }))

  if (!schedule) {
    return (
      <>
        <NavBar title="編集" back={{ label: '戻る', to: '/' }} />
        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--label-secondary)' }}>
          イベントが見つかりません
        </div>
      </>
    )
  }

  const endDateInvalid = values.endDate !== '' && values.endDate < values.startDate
  const canSubmit = values.title.trim() !== '' && values.startDate !== '' && !endDateInvalid

  function handleSave() {
    if (!canSubmit || !schedule) return
    update(schedule.id, {
      title: values.title.trim(),
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      tags: values.tags,
      notes: values.notes.trim() || undefined,
    })
    navigate(`/events/${schedule.id}`, { replace: true })
  }

  return (
    <>
      <NavBar
        title="イベントを編集"
        back={{ icon: 'close', label: 'キャンセル', to: `/events/${schedule.id}` }}
        rightAction={{ icon: 'check', label: '保存', primary: true, disabled: !canSubmit, onClick: handleSave }}
      />
      <div style={{ paddingTop: 16 }}>
        <EventForm
          values={values}
          onChange={patch => setValues(v => ({ ...v, ...patch }))}
          knownTags={knownTags}
        />
      </div>
    </>
  )
}
