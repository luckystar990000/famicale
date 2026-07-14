-- 0006: 時間割 (timetables) と献立 (lunch_tables) を D1 化。
-- localStorage から移行し、 予定と同様に夫婦で共有できるようにする。

CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  cells TEXT NOT NULL DEFAULT '[]',   -- TimetableCell[] を JSON string で保存
  valid_from TEXT,
  valid_to TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,  -- 子供の表示順 (並べ替え用)
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timetables_sort ON timetables(sort_order);

CREATE TABLE IF NOT EXISTS lunch_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  menus TEXT NOT NULL DEFAULT '{}',   -- Record<'YYYY-MM-DD', string> を JSON string で保存
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
