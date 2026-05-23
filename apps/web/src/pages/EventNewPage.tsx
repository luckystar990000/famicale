import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventForm, { type FormValues } from '../components/EventForm'
import NavBar from '../components/NavBar'
import AlertDialog from '../components/AlertDialog'
import { useSchedules } from '../state/schedules'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EventNewPage() {
  const navigate = useNavigate()
  const { create, knownTags } = useSchedules()
  const [values, setValues] = useState<FormValues>({
    title: '', startDate: todayIso(), endDate: '', tags: [], notes: '',
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleSubmit() {
    const title = values.title.trim()
    if (title === '') {
      setErrorMessage('イベント名を入力してください')
      return
    }
    if (values.startDate === '') {
      setErrorMessage('開始日を選んでください')
      return
    }
    if (values.endDate !== '' && values.endDate < values.startDate) {
      setErrorMessage('終了日は開始日以降にしてください')
      return
    }
    create({
      title,
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
        rightAction={{ icon: 'check', label: '追加', primary: true, onClick: handleSubmit }}
      />
      <div style={{ paddingTop: 16 }}>
        <EventForm
          values={values}
          onChange={patch => setValues(v => ({ ...v, ...patch }))}
          knownTags={knownTags}
        />
      </div>

      <AlertDialog
        open={errorMessage !== null}
        title="保存できません"
        message={errorMessage ?? ''}
        confirmLabel="OK"
        hideCancel
        onCancel={() => setErrorMessage(null)}
        onConfirm={() => setErrorMessage(null)}
      />
    </>
  )
}
