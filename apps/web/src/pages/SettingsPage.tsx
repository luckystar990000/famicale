import { useState, useEffect, type FocusEvent } from 'react'
import NavBar from '../components/NavBar'
import AlertDialog from '../components/AlertDialog'
import Toggle from '../components/Toggle'
import { ListSection, ListRow } from '../components/List'
import { useShare } from '../state/share'
import { getEditKey, setEditKey } from '../lib/edit-key'
import { inlineInputStyle } from '../lib/form-styles'
import { pushSupported, getPushSubscription, enablePush, disablePush } from '../lib/push'

export default function SettingsPage() {
  const { shareUrl, generate, revoke } = useShare()
  const [copied, setCopied] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [editLinkCopied, setEditLinkCopied] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    getPushSubscription().then(sub => setPushOn(!!sub))
  }, [])

  async function togglePush() {
    if (pushBusy) return
    setPushBusy(true)
    try {
      if (pushOn) {
        await disablePush()
        setPushOn(false)
      } else {
        const ok = await enablePush()
        setPushOn(ok)
      }
    } finally {
      setPushBusy(false)
    }
  }

  function handleKeyBlur(e: FocusEvent<HTMLInputElement>) {
    setEditKey(e.target.value)
    setEditingKey(false)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 1500)
  }

  async function copyEditLink() {
    const key = getEditKey()
    if (!key) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?k=${encodeURIComponent(key)}`)
      setEditLinkCopied(true)
      setTimeout(() => setEditLinkCopied(false), 1500)
    } catch {
      // ignore
    }
  }

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
        title="設定"
        back={{ to: '/' }}
      />

      {pushSupported() && (
        <ListSection
          header="通知"
          footer="予定の前日 20 時ごろに「明日〇〇」とお知らせします。 iPhone はホーム画面に追加した状態でのみ通知が届きます。"
        >
          <ListRow label="予定の前日通知" trailing={<Toggle on={pushOn} onChange={togglePush} disabled={pushBusy} />} />
        </ListSection>
      )}

      <ListSection
        header="編集キー"
        footer={keySaved ? '保存しました ✓' : '予定の追加・編集にはこのキーが必要です。 「編集用リンクをコピー」で妻や自分の別端末に送り、 開くだけでキー入力なしに編集できます。 閲覧だけの家族には不要です。'}
      >
        {editingKey ? (
          <ListRow align="vertical" label="編集キー">
            <input
              type="text"
              defaultValue={getEditKey() ?? ''}
              placeholder="編集キーを入力"
              onBlur={handleKeyBlur}
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={inlineInputStyle}
            />
          </ListRow>
        ) : (
          <ListRow
            label="編集キー"
            value={getEditKey() ? '設定済み' : '未設定'}
            trailing="›"
            onClick={() => setEditingKey(true)}
          />
        )}
        {getEditKey() && (
          <ListRow onClick={copyEditLink}>
            <span style={{ color: 'var(--tint)' }}>
              {editLinkCopied ? 'コピーしました ✓' : '編集用リンクをコピー'}
            </span>
          </ListRow>
        )}
      </ListSection>

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
