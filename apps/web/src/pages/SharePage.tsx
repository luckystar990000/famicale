import { useState } from 'react'
import NavBar from '../components/NavBar'
import AlertDialog from '../components/AlertDialog'
import { ListSection, ListRow } from '../components/List'
import { useShare } from '../state/share'

export default function SharePage() {
  const { shareUrl, generate, revoke } = useShare()
  const [copied, setCopied] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)

  async function copyUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  function handleGenerate() {
    generate()
    setCopied(false)
  }

  function handleRevokeConfirm() {
    revoke()
    setRevokeConfirmOpen(false)
  }

  return (
    <>
      <NavBar
        title="家族と共有"
        back={{ to: '/' }}
      />

      {!shareUrl ? (
        <div style={{ padding: '20px 16px 0' }}>
          <p style={{
            margin: '0 4px 16px',
            color: 'var(--label-secondary)',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            専用の URL を発行して家族に LINE などで送ると、ログインなしでカウントダウンが見られます。編集はできません。
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '16px 0',
              background: 'var(--tint)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 122, 255, 0.3)',
            }}
          >
            共有 URL を発行する
          </button>
        </div>
      ) : (
        <>
          <ListSection header="共有 URL" footer="この URL を知っている人なら誰でもイベント一覧を閲覧できます。家族以外には共有しないでください。">
            <ListRow align="vertical">
              <div style={{
                fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
                fontSize: 13,
                color: 'var(--label)',
                wordBreak: 'break-all',
                lineHeight: 1.4,
              }}>
                {shareUrl}
              </div>
            </ListRow>
            <ListRow onClick={copyUrl}>
              <span style={{ color: 'var(--tint)' }}>
                {copied ? 'コピーしました ✓' : 'URL をコピー'}
              </span>
            </ListRow>
          </ListSection>

          <ListSection footer="再発行すると新しい URL になり、以前の URL は無効になります。">
            <ListRow onClick={handleGenerate}>
              <span style={{ color: 'var(--tint)' }}>URL を再発行</span>
            </ListRow>
          </ListSection>

          <ListSection>
            <ListRow onClick={() => setRevokeConfirmOpen(true)} destructive>
              共有を無効化する
            </ListRow>
          </ListSection>
        </>
      )}

      <AlertDialog
        open={revokeConfirmOpen}
        title="共有 URL を無効化しますか？"
        message="現在のリンクを知っている家族は見られなくなります。"
        confirmLabel="無効化"
        destructive
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeConfirmOpen(false)}
      />
    </>
  )
}
