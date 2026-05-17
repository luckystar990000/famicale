-- 0002: 設計ピボット (家族共有 + 単一日付モデル) → (一人運用 + 期間イベントモデル)
-- families を廃止、schedules を start_date/end_date モデルに、source カラム追加。
-- MVP 段階で本番データはまだ無いので DROP & CREATE で作り直す。

DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS families;

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  source TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  category TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_schedules_start_date ON schedules(start_date);
CREATE INDEX idx_schedules_end_date ON schedules(end_date);
