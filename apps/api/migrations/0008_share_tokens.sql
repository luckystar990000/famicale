-- 0008: 共有トークンのサーバ化。 閲覧専用 URL /v/<token> の照合を D1 で行う。
-- 運用上は常に 0 or 1 行 (再発行で全削除 → 新規 INSERT)。

CREATE TABLE IF NOT EXISTS share_tokens (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
