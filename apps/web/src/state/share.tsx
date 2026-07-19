import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getShareToken, generateShareToken, revokeShareToken } from '../api/client'

// 共有トークンは D1 が正 (M3 でサーバ化)。 発行・失効は編集キー保護の API 経由。
// 照合はサーバ (requireReadAccess) が行うので、 閲覧側端末に状態は要らない。

interface ShareAPI {
  shareUrl: string | null
  generate: () => void
  revoke: () => void
}

const Ctx = createContext<ShareAPI | null>(null)

export function ShareProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)

  // 編集キーが無い端末では 401 で失敗する (共有 URL 表示が出ないだけ、 実害なし)
  useEffect(() => {
    getShareToken().then(setToken).catch(() => {})
  }, [])

  const generate = useCallback(() => {
    generateShareToken().then(setToken).catch(err => console.error('generateShareToken failed', err))
  }, [])

  const revoke = useCallback(() => {
    revokeShareToken().then(() => setToken(null)).catch(err => console.error('revokeShareToken failed', err))
  }, [])

  const shareUrl = token ? `${window.location.origin}/v/${token}` : null

  return (
    <Ctx.Provider value={{ shareUrl, generate, revoke }}>
      {children}
    </Ctx.Provider>
  )
}

export function useShare(): ShareAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('ShareProvider missing')
  return v
}
