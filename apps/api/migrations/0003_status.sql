-- 0003: schedules に status カラム追加 ('active' | 'cancelled')
-- 中止イベントを履歴として残すため。物理削除とは別軸。

ALTER TABLE schedules ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX idx_schedules_status ON schedules(status);
