-- 0005: web の Schedule モデル (localStorage) に D1 スキーマを合わせる。
-- D1 移行の前提。 localStorage で持っていた拡張フィールドを schedules に追加。
-- category は既に未使用だが、 型からの除去は影響確認が要るため今回は据え置き (NULL 運用)。

ALTER TABLE schedules ADD COLUMN start_time TEXT;
ALTER TABLE schedules ADD COLUMN end_time TEXT;
ALTER TABLE schedules ADD COLUMN visit_date TEXT;
ALTER TABLE schedules ADD COLUMN visited_date TEXT;
ALTER TABLE schedules ADD COLUMN postponed_from TEXT;
ALTER TABLE schedules ADD COLUMN checklist TEXT;  -- ChecklistItem[] を JSON string で保存
