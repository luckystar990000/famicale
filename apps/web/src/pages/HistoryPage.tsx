import NavBar from '../components/NavBar'

export default function HistoryPage() {
  return (
    <>
      <NavBar title="履歴" />
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--label-secondary)' }}>
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>
          アップロードしたプリントの履歴がここに表示されます。
        </p>
        <p style={{ fontSize: 13, color: 'var(--label-tertiary)', marginTop: 24 }}>
          (準備中 / 近日対応)
        </p>
      </div>
    </>
  )
}
