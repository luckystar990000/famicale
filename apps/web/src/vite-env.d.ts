/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 本番の API 絶対 URL (`/api` 込み)。 未設定なら同一オリジンの `/api` にフォールバック。
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
