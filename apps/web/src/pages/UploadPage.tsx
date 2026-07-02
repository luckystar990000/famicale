import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, FlaskConical } from 'lucide-react'
import type { ExtractedSchedule } from '@famicale/shared'
import NavBar from '../components/NavBar'
import Checkbox from '../components/Checkbox'
import { ListSection, ListRow } from '../components/List'
import { useSchedules } from '../state/schedules'
import { uploadDocument, isOcrMock, setOcrMock } from '../api/client'

type Status = 'idle' | 'preview' | 'analyzing' | 'review' | 'error'

export default function UploadPage() {
  const navigate = useNavigate()
  const { bulkCreate } = useSchedules()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedSchedule[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFile(f: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
    setStatus('preview')
    setExtracted([])
    setSelected(new Set())
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setExtracted([])
    setSelected(new Set())
    setErrorMsg(null)
    setStatus('idle')
  }

  async function handleAnalyze() {
    if (!file) return
    setStatus('analyzing')
    setErrorMsg(null)
    try {
      const result = await uploadDocument(file)
      if (result.status !== 'done' || !result.schedules) {
        setErrorMsg(
          result.error === 'scanned-pdf'
            ? 'この PDF は画像のため文字を読み取れませんでした。写真として取り込んでください'
            : result.error === 'unsupported-type'
            ? '写真または PDF を選んでください'
            : result.error === 'file-too-large'
            ? 'ファイルが大きすぎます (上限 10MB)'
            : '解析に失敗しました。もう一度お試しください'
        )
        setStatus('error')
        return
      }
      setExtracted(result.schedules)
      setSelected(new Set(result.schedules.map((_, i) => i)))
      setStatus('review')
    } catch {
      setErrorMsg('解析に失敗しました。もう一度お試しください')
      setStatus('error')
    }
  }

  function toggle(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleAdd() {
    const inputs = extracted.filter((_, i) => selected.has(i))
    if (inputs.length === 0) return
    bulkCreate(inputs.map(s => ({
      title: s.title,
      startDate: s.startDate,
      endDate: s.endDate,
    })), 'document')
    navigate('/', { replace: true })
  }

  const rightAction = status === 'preview' ? {
    label: '読み取る', primary: true, onClick: handleAnalyze,
  } : undefined

  return (
    <>
      <NavBar
        title={status === 'review' ? '読み取った予定' : 'プリントから読み取り'}
        back={{ to: '/' }}
        rightAction={rightAction}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      <div style={{ padding: '20px 16px 0' }}>
        {status === 'idle' && (
          <>
            <DropArea onClick={() => inputRef.current?.click()} />
            {import.meta.env.DEV && <DevOcrToggle />}
          </>
        )}

        {(status === 'preview' || status === 'analyzing' || status === 'error') && (
          <>
            <PreviewCard file={file} previewUrl={previewUrl} status={status} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={reset}
                disabled={status === 'analyzing'}
                style={secondaryBtn(status === 'analyzing')}
              >
                やり直す
              </button>
              {status !== 'analyzing' && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  style={primaryBtn(false)}
                >
                  AI で読み取る
                </button>
              )}
            </div>
            {status === 'error' && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--destructive)', textAlign: 'center' }}>
                {errorMsg ?? '解析に失敗しました。もう一度お試しください'}
              </p>
            )}
          </>
        )}
      </div>

      {status === 'review' && (
        <ReviewList
          extracted={extracted}
          selected={selected}
          onToggle={toggle}
          onCancel={reset}
          onAdd={handleAdd}
        />
      )}
    </>
  )
}

function DropArea({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press-feedback"
      style={{
        width: '100%',
        minHeight: 240,
        background: 'var(--bg-card)',
        backdropFilter: 'saturate(160%) blur(22px)',
        WebkitBackdropFilter: 'saturate(160%) blur(22px)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0,0,0,0.05)',
        borderRadius: 27,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        padding: '36px 20px',
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: 27,
        background: 'rgba(0, 122, 255, 0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Plus size={30} strokeWidth={2.2} color="var(--tint)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)' }}>
        写真 / PDF から取り込み
      </div>
      <div style={{ fontSize: 13, color: 'var(--label-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
        アルバム・カメラ・ファイル
      </div>
    </button>
  )
}

function PreviewCard({ file, previewUrl, status }: {
  file: File | null
  previewUrl: string | null
  status: Status
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      backdropFilter: 'saturate(160%) blur(22px)',
      WebkitBackdropFilter: 'saturate(160%) blur(22px)',
      border: '0.5px solid var(--glass-border)',
      boxShadow: 'inset 0 1px 0 var(--glass-inner-hi), 0 6px 22px rgba(0,0,0,0.05)',
      borderRadius: 27,
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100%', minHeight: 240, maxHeight: 360,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.04)',
      }}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ padding: 40, color: 'var(--label-secondary)', textAlign: 'center' }}>
            <FileText size={32} strokeWidth={1.8} color="var(--label-secondary)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14 }}>{file?.name ?? 'PDF ファイル'}</div>
          </div>
        )}
      </div>
      {status === 'analyzing' && (
        <div style={{
          padding: '14px 16px',
          borderTop: '0.5px solid var(--separator)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Spinner />
          <span style={{ fontSize: 14, color: 'var(--label-secondary)' }}>
            AI が予定を抽出中…
          </span>
        </div>
      )}
    </div>
  )
}

function ReviewList({ extracted, selected, onToggle, onCancel, onAdd }: {
  extracted: ExtractedSchedule[]
  selected: Set<number>
  onToggle: (i: number) => void
  onCancel: () => void
  onAdd: () => void
}) {
  if (extracted.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--label-secondary)' }}>
        <p>予定が見つかりませんでした</p>
        <button onClick={onCancel} style={{ ...secondaryBtn(false), flex: 'none', width: '100%', maxWidth: 200, margin: '16px auto 0', display: 'block' }}>
          やり直す
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <ListSection header={`抽出されたイベント (${extracted.length})`}>
        {extracted.map((s, i) => {
          const checked = selected.has(i)
          return (
            <ListRow key={i} onClick={() => onToggle(i)} align="vertical">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Checkbox checked={checked} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--label)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--label-secondary)', marginTop: 2 }}>
                    {formatRange(s.startDate, s.endDate)}
                  </div>
                </div>
              </div>
            </ListRow>
          )
        })}
      </ListSection>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
        <button type="button" onClick={onCancel} style={secondaryBtn(false)}>
          やり直す
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={selected.size === 0}
          style={primaryBtn(selected.size === 0)}
        >
          {selected.size} 件を追加
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: 999,
      border: '2px solid rgba(0, 122, 255, 0.2)',
      borderTopColor: 'var(--tint)',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// 開発専用: OCR を mock ⇄ 実 API で切替 (本番ビルドでは idle 側の import.meta.env.DEV ガードで非表示)。
function DevOcrToggle() {
  const [mock, setMock] = useState(isOcrMock())
  function toggle() {
    const next = !mock
    setOcrMock(next)
    setMock(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="press-feedback"
      style={{
        marginTop: 14,
        width: '100%',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        background: 'var(--bg-card)',
        backdropFilter: 'saturate(160%) blur(14px)',
        WebkitBackdropFilter: 'saturate(160%) blur(14px)',
        border: '0.5px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-inner-hi)',
        borderRadius: 27,
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
        <FlaskConical size={16} strokeWidth={2} color={mock ? 'var(--tint)' : 'var(--label-secondary)'} />
        OCR: {mock ? 'モック (AI 不使用)' : '実 API'}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-secondary)' }}>
        タップで切替
      </span>
    </button>
  )
}

function formatRange(start: string, end?: string): string {
  const s = formatDate(start)
  if (!end || end === start) return s
  return `${s} 〜 ${formatDate(end)}`
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    month: 'numeric', day: 'numeric', weekday: 'short'
  })
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    flex: 2,
    padding: '14px 0',
    background: 'var(--tint)',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    boxShadow: '0 4px 14px rgba(0, 122, 255, 0.3)',
  }
}

function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px 0',
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'saturate(180%) blur(14px)',
    WebkitBackdropFilter: 'saturate(180%) blur(14px)',
    border: '0.5px solid var(--glass-border)',
    boxShadow: 'inset 0 1px 0 var(--glass-inner-hi)',
    color: 'var(--label)',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}
