-- 0004: schedules に tags カラム追加 (JSON 配列を string で保存)
-- 用途: 「家族」「長男」「長女」「次男」など、 担当者/対象別の自由タグ

ALTER TABLE schedules ADD COLUMN tags TEXT;
