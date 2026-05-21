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
