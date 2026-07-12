import type { CSSProperties } from 'react'

// ListRow 内に置くインライン入力欄の共通スタイル。 枠は ListRow が提供し、 input 自体は透過。
// 予定入力 (EventForm) や設定入力 (SharePage の編集キー) など、 ListRow 内テキスト入力で共用する。
export const inlineInputStyle: CSSProperties = {
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
