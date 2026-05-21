# ファミカレ 実装計画書

セッション再開用の進捗 + 計画ドキュメント。確定済みの方針・コンセプトはユーザーのメモリに残してあるので、ここでは進捗と実装詳細仕様、未決事項を中心に書く。

## 関連メモリ (再開時に必ず読む)

- `project_famicale.md` — プロジェクト全体像、Cloudflare スタック、monorepo 構造
- `project_famicale_ux.md` — UX 軸 (カウントダウン中心 / 期間モデル / 共有 URL 方式 / 確定 MVP 仕様)
- `project_famicale_inputs.md` — 入力ソースの実態 (紙 + PDF、重複許容)
- `project_famicale_design.md` — **UI/デザイン規則は `famicale/docs/DESIGN.md` に集約 (UI 作業前に必読)**
- `feedback_minimum_required_inputs.md` — 必須項目を極小に保つ原則
- `feedback_workspace_layout.md` — work_luckystar は親ワークスペース
- `reference_design_doc.md` — 元設計書 (Obsidian) の場所

## デザインシステム

UI のことを書き換える/新画面追加するときは **必ず `famicale/docs/DESIGN.md` を参照**。色マップ・コンポーネント仕様・ガラス効果レシピ・タイポ・「やってはいけないこと」が集約されている。

## 現在の状況 (2026-05-16)

- 元設計書からピボット済み: 「家族カレンダー」→「一人運用 + 共有 URL 閲覧」+「月表示」→「カウントダウン中心」
- DB スキーマ刷新 + カウントダウンビュー (iOS standalone + ゲージ) まで実装済み
- 次は **#3 ルーティング基盤 + UI 強化** から再開

## タスク状態

### 完了
- **#1 DB スキーマ刷新** — `migrations/0002_pivot.sql`、families 廃止、schedules を期間モデル (start_date/end_date) + source カラムに。
- **#2 カウントダウンビュー** — CountdownPage / event-status.ts / manifest + apple meta / セーフエリア / ゲージ塗り方向切替 (30 日基準)。
- **#3 ルーティング基盤 + UI 強化** — react-router-dom、 今日の日付、 絞り込み 5 タブ、 タブ別並び順、 バッジ・日付ラベル、 pulse アニメ。
- **#4 画像 OCR (モック)** — UploadPage、 mock-ocr.ts、 bulkCreate。 実 API 接続は Cloudflare セットアップ後。
- **#6 閲覧専用共有 URL** — ShareProvider、 SharePage、 ViewerPage (`/v/:token`)、 ホーム右上の Share2 ボタン、 token は URL クエリ。
- **#7 タグ機能 (担当別)** — schedules.tags、 マイグレーション 0004、 EventForm の TagInput、 詳細画面の Tag ListSection、 ホーム/閲覧カードに chip 表示。
- **#8 + #9 詳細/編集/削除/中止/手動追加** — Schedule Context (localStorage 永続化、 API 未接続)、 EventForm / NavBar / List / Sheet コンポーネント、 マイグレーション 0003 (status)。
- **#10 イベント検索** — ホーム上部の SearchBar、 タイトル/メモ/タグの部分一致。
- **追加: iOS 18+ HIG + Liquid Glass 風 UI** — `docs/DESIGN.md` に集約。 背景パステルグラデ、 半透明白カード、 NavBar/TabBar の素直な hard line (iOS 26 で blur 不可と確認済み、 [[project-famicale-environment]] 参照)。
- **追加: タグ絞り込み + 検索 + メモ表示** — TagFilter chips、 URL クエリ `?tag=...`、 カード/詳細 chip タップで絞り込み、 メモは 2 行 line-clamp。
- **追加: Sheet モーダル編集 (iOS 風)** — 詳細画面の各フィールド (タイトル/日付/タグ/メモ) タップで sheet 編集、 `createPortal(..., document.body)` で iOS Safari の `position: fixed` 制約回避、 編集画面の右上ボタン廃止。
- **追加: スクロール位置復元** — ScrollManager (useNavigationType 利用) で POP 時のみ復元、 NavBar 戻るボタンも `navigate(-1)` で POP に統一。

### 未着手

#### #5 PDF 入力経路追加 (残り唯一の元タスク)
- PDF 用シナリオを mock-ocr で差別化、 実 API では `pdfjs-dist` 等でテキストレイヤ抽出
- 詳細は元の節を参照

(以下は元の計画詳細、 履歴用に残す)

#### #3 ルーティング基盤 + UI 強化 (完了済み)
- `react-router-dom` 導入 (apps/web)
- ルート定義:
  - `/` → CountdownPage
  - `/upload` → UploadPage (既存、後で #4 で繋ぎ直し)
  - `/history` → HistoryPage (既存、後で #4 で繋ぎ直し)
  - `/events/new` / `/events/:id` / `/v/:token` は後続タスクで追加
- App.tsx のボトムナビを `<Link>` ベースに変更 (URL と同期)
- ヘッダーに今日の日付 (`5/16 (土)` 形式)
- 絞り込みタブを iOS 風セグメントコントロール (B) で実装
  - タブ: 全て / 開催中 / まだ / 終わりそう
  - 「終わりそう」= ending-soon のみ (確認済み)
- タブ別デフォルト並び順:
  - 全て: 状態グルーピング + 開始日昇順 (現状)
  - 開催中: 終了近い順 (end_date 昇順)
  - まだ: 開催近い順 (start_date 昇順)
  - 終わりそう: 終了近い順 (end_date 昇順)
- 手動の並び替え切替は MVP 外
- バッジ表記の改善:
  - upcoming / upcoming-soon → 「開始まで N 日」
  - ongoing-today → 「今日」
  - ongoing → 「開催中・残 N 日」または「終了まで N 日」
  - ending-soon → 「終了まで N 日」
  - past → 「終了」
- 日付ラベル:
  - upcoming-soon → 「5/19 開催」(開催日を強調)
  - ending-soon → 「7/20 終了」(終了日を強調)
  - その他 → 期間そのまま (例「5/25(土)」「5/25 〜 7/20」)

#### #8 イベント詳細画面 + 編集 / 中止 / 削除
- マイグレーション 0003: `schedules.status` カラム追加 (`'active' | 'cancelled'`、default 'active')。型と API ルートも追従。
- `/events/:id` ルート → 詳細画面
  - タイトル / 期間 / 残り日数 (大きく) / メモ / 編集ボタン / 中止ボタン / 削除ボタン
- `EventForm` 共通コンポーネント (新規/編集兼用)
  - フィールド: タイトル (必須) / 開始日 (必須) / 終了日 (任意) / メモ (任意)
  - バリデーション: 必須 2 つのみ
- 編集 → 同じ画面でフォームに切替 or 別画面 `/events/:id/edit`
- 中止 → `status = 'cancelled'`。カードは終了済みセクションに「中止」ラベル付きで表示。
- 削除 → 物理削除。確認ダイアログを出す。
- 延期は編集 (日付変更) で対応。専用ボタンは不要。

#### #9 手動イベント追加フォーム
- `/events/new` ルート
- EventForm を流用 (#8 で作る)
- 完了後はホームに `navigate('/')`
- 必須はタイトル + 開始日のみ ([[feedback-minimum-required-inputs]] 遵守)

#### #4 画像 OCR 経路を新スキーマに繋ぎ直し
- `lib/ocr.ts` プロンプトはすでに startDate/endDate 対応済みだが、出力検証や year 補完を強化
- `routes/documents.ts` の INSERT が新スキーマ準拠か確認
- `UploadPage` を新ルーティングに合わせて整理
- アップロード後の文書 → 抽出されたスケジュールが一覧表示されるよう導線整える

#### #5 PDF 入力経路追加
- アップロード受付に PDF 拡張子も追加
- テキストレイヤ抽出ライブラリの選定 (pdfjs-dist / unpdf 等、Workers で動くもの)
- テキストレイヤあり → テキストを Claude API (vision なし) に渡して抽出 (コスト・精度有利)
- スキャン PDF → 1 ページ目を画像化して既存の vision 経路へ
- ステータスを documents テーブルで持つ

#### #6 閲覧専用共有 URL
- `share_tokens` テーブル新設 (token / created_at) または環境変数 1 つで運用
- `/v/:token` ルート → 読み取り専用カウントダウンビュー
- ナビ・編集 UI を隠す
- API 側は token 認証だけ通る GET 限定エンドポイントを用意 (もしくはトップレベルの GET は誰でも叩ける運用)

#### #7 タグ機能 (MVP 外、後回し)
- 担当 (子供別) 用途を主目的に
- 排他カテゴリは採用しない
- 必須化しない、空 OK
- 実装は schedules.tags JSON 配列 or 中間テーブル

## 確定済みの主要判断 (再掲)

- **分類は MVP に入れない** — 状態 (開始前/開催中/終了間近) の色分けで十分。タグ機能は後回し。
- **必須項目は最小** — タイトル + 開始日のみ。それ以外は全て任意 ([[feedback-minimum-required-inputs]])。
- **共有方式** — 推測困難な token を URL に埋める。ログインなし。
- **入力ソース** — 画像 / PDF テキストレイヤ / PDF スキャン の 3 系統。重複排除は MVP 外。
- **ゲージ方向** — 開始前は右寄せ (右から満ちる)、開催中は左寄せ (右から削れる)、当日は満タン、30 日基準。
- **iOS アプリ風** — manifest + apple-touch-icon + apple-mobile-web-app-capable で standalone。Service Worker は入れない (PWA フル採用しない)。

## 残課題 / 未決事項

- アイコンは仮の SVG。後でちゃんとデザイン差し替え。
- Cloudflare セットアップ (wrangler login / D1 / R2 / secret) は実デプロイ時にユーザーが手動で実施。
- 通知 (前日リマインダ) は MVP 外。
- 重複検出は MVP 外。
- 並び順の手動切替は MVP 外。
- 絵文字 / 遊び心の演出は機能完成後に検討。

## 機能バックログ (MVP 外、将来検討)

詳細は `project_famicale_backlog.md` (メモリ) に集約:

- **持ち物 (チェックリスト)** — イベントに紐づくチェックリスト、通知と連動できると価値が出る
- **日付未定の覚書スケジュール** — 「いつか行きたい」リスト的な用途、start_date を nullable にする選択肢あり
- **献立 (給食メニュー) 登録** — 日付 → 品目の lookup。 別データ型 + OCR パイプライン共有 + ホーム「今日/明日」ブロックに合流。 兄弟/複数校対応・給食なし日の扱いは未決 (2026-05-17 追加)
- **時間割登録** — 曜日 × 時限のグリッド。 学期で改訂されるので `valid_from` / `valid_to` 必須。 持ち物機能とセットで詰めると価値が出る (2026-05-17 追加)
- **「イベント期間」 と「自分の行く日」 の分離** — 大絶滅展 (5/1-9/30) のような期間 + 自分が行く日 (6/7) を 1 件で持つか 2 件に分けるか。 仮本命は案 A (optional `visitDate` 追加で countdown 切り替え)、 兄弟/複数回訪問が頻出なら案 B (親子イベント) に格上げ。 詳細はメモリ参照 (2026-05-19 追加)
- **公開/非公開フラグ** — 共有 URL に出す/出さないをイベント単位で。#6 実装時に `visibility` カラムを足しておくと後がラク

## タグ機能の発展計画 (2026-05-21)

タグまわりは MVP に入っていてさらに育てる余地が大きいので、 独立した計画ブロックとして詰める。

### 現状 (実装済)

- **データ**: `schedules.tags` は JSON 配列 (string[])。 マイグレーション 0004 で追加。
- **永続化**: タグ自体は `famicale.tags.v1` (localStorage) に registry として別保存。 schedule から最後の参照を外しても、 registry には残るタイプ B (GitHub 風)。
- **`knownTags`**: `useSchedules()` から取れる。 `union(registry, 全 schedule.tags)`。 初回マウントで既存 schedule のタグを registry に seed (移行用)。
- **削除**: `deleteTag(name)` で registry から削除 + cascade で全 schedule から剥がす。
- **UI**:
  - `EventForm` の TagInput: knownTags から suggest、 Enter / カンマ確定、 自由入力可。
  - `CountdownPage` の TagFilter: chip 横並び、 タップで絞り込み (`?tag=...`)。 未使用タグは `opacity 0.55` で薄表示。 長押し 600ms → `AlertDialog` 確認 → 削除。
  - カード上の tag chip タップで絞り込み。
- **ラベル連動**: タグ `誕生日` が付いていればカウントダウンラベルが `開始まで N 日` → `誕生日まで N 日` に切り替わる ([[project-famicale-real-usage]] が動機)。

### 既知の弱点

- **localStorage 依存**: ITP の 7 日不訪問で registry ごと消える可能性 ([[feedback-ios-safari-storage]])。 D1 移行時に同時解消する想定。
- **削除 UI の発見性**: 長押しは隠し操作。 妻含む実ユーザーが「タグの整理」 を意識したときに見つけられるか怪しい。 → 短期発展案で対策予定。
- **マジック文字列依存**: ラベル切替が `'誕生日'` 文字列リテラル一致。 「お誕生日」「バースデー」 表記揺れに対応できない ([[project-famicale-deferred-refactors]])。
- **タグの種類が暗黙**: 対象者タグ (家族 / 長男 / 長女 / 次男) と種別タグ (誕生日) が同じ配列に混在。 UI 上の区別なし。

### 短期発展案 (優先度 高、 ユーザー痛みが具体的に出てる)

#### S1. タグ管理画面 (or sheet)

長押しに加えて、 もっと素直な入り口を用意する。 候補:

- **案 A (推し)**: 設定ナビ的な場所にタグ一覧 sheet (`/tags`)。 各行: `タグ名 + 使用件数 + 削除ボタン`。 タップで `EventForm` の suggestion から消える / 残るを管理。 リネーム機能もここに同居できる。
- **案 B**: TagFilter 右端に `編集` ボタン → モード切替で各 chip に × バッジ → タップで削除確認。 専用画面なし。

着手トリガ: 妻 / 自分が「整理したい」 を言葉に出した瞬間。

#### S2. タグのリネーム

「長男」 を 「太郎」 に変えたい、 みたいなニーズ。 実装:

- `renameTag(oldName, newName)` を `SchedulesProvider` に追加。 registry を入れ替え + 全 schedule.tags の該当要素を新名で置換。
- UI は S1 のタグ管理画面に rename ボタンを置くのが自然。

S1 と同時着手が綺麗。

### 中期発展案 (タグ概念の進化)

#### M1. タグの分類 (kind) を導入

`schedules.tags` は文字列配列のままにしつつ、 tags registry を `{ name, kind }` のオブジェクト配列に格上げ。 `kind` は最低限 `'person'` (対象者) と `'category'` (種別) の 2 つ。

メリット:
- 種別タグ (誕生日 / 旅行 / 試合 / 通院) ごとにラベル / 色 / アイコンを定義可能。 マジック文字列依存を脱却。
- TagFilter UI を分類別グループ化できる: 「対象者で絞り込み」 と 「種別で絞り込み」 を分ける。 chip が増えても整理される。
- タグ作成時に kind を選ばせる UX (= 設定画面が前提なので S1 着手後)。

未決:
- kind を 2 つで足りるか。 「場所」 (家 / 学校 / 病院) も別カテゴリにしたい説あり。
- 既存タグの kind 推定 / 初期割り当て。 「家族 / 長男 / 長女 / 次男」 → person、 「誕生日」 → category、 等を seed migration で初期化。
- schedules.tags は flat string[] のままで OK (kind は registry 側で持つ)。

#### M2. 種別タグ → カウントダウン文言マップを構造化

`誕生日 → 誕生日まで` のような対応を、 ハードコードでなくテーブルとして持つ。

```
[{ kind: 'category', name: '誕生日', countdownLabel: '誕生日まで', subtitle: 'あと少しで誕生日' },
 { kind: 'category', name: '旅行', countdownLabel: '旅行まで', subtitle: '旅行が近づいてます' },
 ...]
```

`statusBadge` / `heroText` はこのマップ参照に切り替え。 M1 が前提。

### 長期発展案 (アーキテクチャ)

#### L1. 完全正規化 (schedule_tags 中間テーブル)

`schedules.tags` JSON 配列をやめて、 `tags(id, name, kind)` + `schedule_tags(schedule_id, tag_id)` に。 D1 移行と合わせると自然。

メリット: rename / merge が中間テーブル更新だけで済む。 整合性が DB レベルで保証される。
デメリット: API / 移行コスト大きい。

着手トリガ: D1 接続が走るタイミング ([[project-famicale]] のスタック移行)。

#### L2. タグの色 / アイコン

各タグに色 + アイコン (lucide-react から選択) を持たせる。 chip / カードの視覚的識別子。 M1 の registry オブジェクト化に同居可能。

#### L3. 家族間でのタグ統一

共有 URL 経由の閲覧者がタグ追加 / 編集することは MVP では無いが、 将来「家族メンバーが各自編集」 へ進む場合、 タグ命名のずれ (「長男」 vs 「太郎」) が問題化する。 統一マスタとしての tags テーブル前提。 L1 と同時にしか意味が出ない。

### 着手判断マトリクス

| 案 | コスト | 価値が出る条件 |
|---|---|---|
| S1 タグ管理画面 | 中 | 妻 / 自分がタグ整理を意識した瞬間 |
| S2 リネーム | 小 (S1 にぶら下げ) | 名前を間違えて入れた / 統一したくなった |
| M1 kind 導入 | 中 | 種別タグ (誕生日 / 旅行 等) が 3 個以上溜まってきた |
| M2 文言マップ | 小 (M1 後) | M1 直後 |
| L1 正規化 | 大 | D1 接続着手と同期 |
| L2 色アイコン | 中 | UI 改善余力があるとき |
| L3 共有編集 | 大 | 一人運用から家族編集へピボットしたい意思が出たとき |

短期 S1 / S2 → 中期 M1 / M2 → 長期 L1 / L2 / L3 が素直な進行順。 ただし M1 は S1 が無くても先行できる (registry を裏で構造化するだけなら UI 影響ゼロ)。

## 開発コマンド

```bash
# プロジェクトルート (famicale/) で
npm install                              # 初回のみ
npm run dev:web                          # Vite dev (host:true で LAN 公開、iPhone から見られる)
npm run dev:api                          # Wrangler dev (Cloudflare セットアップ後)
npm run type-check --workspaces          # 全 workspace 型チェック
```

iPhone から見る: Mac の IP に同じ Wi-Fi で `http://<Mac-IP>:5173/`、Safari 共有 → ホーム画面に追加でアプリ風。

## 次セッション再開時の手順

1. このファイル (`famicale/PLAN.md`) を読む
2. 関連メモリを読む (上部リスト)
3. UI 作業をするなら `famicale/docs/DESIGN.md` も必読
4. 進行中タスクから着手 (現時点は **#5 PDF 入力経路追加** が次の未着手元タスク。 ユーザー追加要望 (UI 改良) も歓迎)
5. 着手時はタスクシステムで in_progress にマーク、完了時 completed に
