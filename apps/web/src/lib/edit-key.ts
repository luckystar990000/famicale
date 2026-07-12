// 編集キー: 書き込み API を叩くための共有シークレット。 夫婦 2 人が同じキーを各端末に保持する。
// 端末ローカル (localStorage) に置き、 書き込みリクエストの X-Edit-Key ヘッダに載せる。
const STORAGE_KEY = 'famicale.edit_key.v1'

export function getEditKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

export function setEditKey(key: string): void {
  try {
    const trimmed = key.trim()
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
