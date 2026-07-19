-- 0007: Web Push の購読情報。 前日通知の送信先。
-- endpoint がブラウザ/端末ごとにユニーク。 keys は payload 暗号化に使う。

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
