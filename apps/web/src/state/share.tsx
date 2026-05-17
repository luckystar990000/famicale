import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'famicale.share_token.v1'

function generateToken(): string {
  const arr = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface ShareAPI {
  token: string | null
  shareUrl: string | null
  generate: () => string
  revoke: () => void
  isValidToken: (t: string) => boolean
}

const Ctx = createContext<ShareAPI | null>(null)

export function ShareProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })

  useEffect(() => {
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [token])

  const generate = useCallback(() => {
    const t = generateToken()
    setToken(t)
    return t
  }, [])

  const revoke = useCallback(() => setToken(null), [])

  const isValidToken = useCallback((t: string) => token !== null && t === token, [token])

  const shareUrl = token ? `${window.location.origin}/v/${token}` : null

  return (
    <Ctx.Provider value={{ token, shareUrl, generate, revoke, isValidToken }}>
      {children}
    </Ctx.Provider>
  )
}

export function useShare(): ShareAPI {
  const v = useContext(Ctx)
  if (!v) throw new Error('ShareProvider missing')
  return v
}
