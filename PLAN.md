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

## 現在の状況 (2026-05-24 スナップショット)

直近で実装済み (commit ハッシュ付き、 新しい順):

- (this commit) **イベントに時刻 (開始 / 終了) を任意追加**:
  - `schedule.startTime` / `schedule.endTime` を optional フィールド追加
  - 詳細画面に「時刻」 ListSection を新設 (「日付」 ListSection の直下、 付随データとして別ブロック分け)
  - 各時刻は個別 optional、 「+ ○○時刻を追加」 アフォーダンス + 設定済は time input + × クリア
  - カード日付ラインに `(10:00〜17:00)` 形式で薄い灰色 (`--label-tertiary`) で後置
- `2c45450` **visitOutOfRange の警告状態 (赤系トーン)**:
  - visitDate 設定時に終了日後の日付を入れたら AlertDialog で確認、 OK で設定
  - 設定後の赤系トーン: カード root 1.5px 赤枠 / Header 赤 / Body / Footer 薄赤 bg / visit pill 紫 → 赤 / gauge 赤 / 詳細ヒーローも赤
  - visit pill の「あと N 日」 を「終了後」 に置換、 ヒーロー大数字も「終了後」 + subtitle「行く日が終了日を過ぎています」
  - 詳細画面の「行く日」 input 文字色赤化、 警告メッセージを ListSection 内に右寄せで密着配置
  - 用語統一: 「会期」 (= 混乱しやすい) → 「終了日」 / 「期間」 系に。 「終了済」 (イベント自体終了の誤解) → 「終了後」 (= 終了日後の visitDate)
  - visitDate input の min を max(today, startDate) に制限 (過去日付入らない別バリデーションも追加)
- `4c7fc50` **eventStatus 分離 + バッジ outline / ネオングロー**:
  - 並び / 絞り込み / Header 色 / 終わったイベント分類 は **eventStatus (イベント期間 base)** を使うように分離。 「visitDate set な開催中イベント」 が upcoming 分類でリスト下がる問題解消
  - 全 badge / visit pill に `.event-badge` で 1px outline (currentColor 35%)。 メリハリアップ
  - `.badge-pulse` を `transform: scale` ベース → `box-shadow` ベースのネオングロー明滅に。 currentColor + color-mix で badge 色 (赤 / 青 / 紫) に追従、 14px blur / 1px spread / alpha 38% / 2.6s 周期
- `fccf199` **EventCard 微調整 (visit pill + gauge pattern + 文字)**:
  - 「行く日」 visit pill を Header 右上の通常 badge と統合: visitDate set + active 時、 紫 pill が「行く日 6/14 ・ あと N日」 を担う (countdown 情報も込み)。 試行錯誤の末たどり着いた最終形 (Body 内 pill / 1 行帯 / Header line 2 ピル等を経由)
  - Gauge fill に SVG inline の「<<<<」 シェブロンパターンを白 alpha 0.3 で重ねる (時間の流れ暗示)。 アニメは無し
  - カードの日付テキストを 13 → 14px + weight 500、 active は label 色、 past は secondary 色 (主軸情報として強化)
  - Body から visit pill / 期間補足 を Header と日付テキストに集約、 メリハリ調整
- `96c1a99` **EventCard 仕上げ (gauge 位置 + past 文字色 + 空トラックバー)**: gauge を Header と Body の間に移動、 past 文字色 1 段薄く、 gauge null も空バー
- `fa378e7` **visitDate (行く日) + EventCard 再構築 + 詳細アクション整理 + Toast**:
  - `Schedule.visitDate` 追加 (backlog #5 案 A)、 期間イベントに「自分が行く日」 1 個を持てる。 visitDate set 時の countdown / sort / 延期は visitDate 基準。 兄弟複数日対応は案 B として保留
  - ホーム EventCard を **Header / Body / Footer + Gauge** に再構築。 StatusDot / chevron / 期間補足 / postponedFrom 表示はカードから廃止 (詳細画面のみ)。 Header に状態色 alpha 0.06 オーバーレイで弱グルーピング
  - 詳細画面のアクションを再構成: 「ズラす」「イベントの日程をズラす」 (visitDate set 時)「行くのをやめる」「中止 / 削除」 を主語付きに、 小見出し「予定の編集」 で情報セクションと区切る
  - Toast コンポーネント新設 (Liquid Glass レシピで AlertDialog と統一、 全幅、 取り消すボタン付き)。 中止 / 行くのをやめる で Toast + undo
  - 「1 タップ翌日ズラス」 ショートカットは試作後に廃止。 Sheet 経由 (+1 日 chip) のみに統一
- `7b58cac` **延期機能**: schedules に `postponedFrom` 追加、 詳細「延期する」 アクション + Sheet (デフォ +7 日 + クイック chip)、 カード / 詳細に「○月○日から延期」 表示
- `16f6a4e` **DESIGN.md**: 「UI 振る舞い原則」 6 箇条セクション新設、 ナビ表記更新、 don't 追加
- `dcbb116` 時間割マス編集にクリアボタン追加
- `55852e2` 時間割 microcopy 整理
- `ffdb1f2` 新規イベントのタグを `+` アフォーダンス化、 footer 廃止 → エラーモーダル
- `22ffc55` 終了日を `+ 終了日を追加` アフォーダンス化
- `f8262a3` **時間割機能 MVP**: state + モック OCR + 一覧 + グリッド編集 + ホーム「今日」 ブロック
- `e619e3f` PLAN.md「時間割機能の実装計画」 追加
- `770b773` upcoming subtitle 射程修正
- `b54dcb7` **タグ persistence** (registry + 長押し削除)
- `aa63bb6` 終わったイベント展開時のオートスクロール
- `12f2f1c` **誕生日タグでラベル切替**、 終了後 7 日 home 残し

開いている検討事項 / 次セッションへの引継ぎ:

- **編集は夫婦 2 人に方針転換 (2026-07-11)**: 当初「一人編集 + 閲覧共有」だったが、 妻も予定を書き込むため「夫婦 2 人が編集」に変更。 ただし 2026-05-23 に一度検討して見送った「家族全員編集 / 編集者識別 / アクティビティログ」の重い方向ではなく、 **共有編集キー方式** (書き込み API に編集キーを要求、 夫婦で同じキーを共有、 誰が編集したかは記録しない) で軽く実現する。 閲覧は従来通り公開共有 URL。 マイスケジュール概念をバックログ #7 と統合する方針は継続
- **妻のテスト feedback ループ**: 出先で確認続行中。 「読まれない」 系の microcopy を「アフォーダンス + 事後エラーモーダル」 で潰すフェーズ。 新たに指摘出たら `[[feedback_dont_rely_on_microcopy]]` の原則で都度対応
- **タスク優先度** (2026-07-02 更新。 OCR 実 API / PDF / 献立 / 持ち物フェーズ 1 は完了済み):

  **完了 (2026-07-11): 本番デプロイ (方針A = localStorage のまま公開)**:
  - web: https://famicale.pages.dev (Cloudflare Pages, SPA fallback 有効で直リンク OK)
  - api: https://famicale-api.luckystar-990000.workers.dev (Workers。 D1 `famicale-db` + R2 `famicale-images` + Workers AI 稼働。 migrations 0001-0004 適用済)
  - GitHub: luckystar990000/famicale (private)。 作者はローカル config で luckystar990000 に統一。 push のみで自動デプロイは未設定
  - デプロイは手動 wrangler:
    - api: `cd apps/api && npx wrangler deploy`
    - web: `cd apps/web && VITE_API_BASE=https://famicale-api.luckystar-990000.workers.dev/api npm run build && npx wrangler pages deploy dist --project-name=famicale --branch=main --commit-dirty=true`
  - 別ドメイン構成なので web は VITE_API_BASE でビルド時に Worker 絶対 URL を注入 ([[project-famicale]] アーキテクチャ)
  - ⚠️ 未検証: 実機での OCR アップロード (web→Worker の CORS 込み往復)。 curl では裏取り不能

  **最優先だった D1 移行: M1 / M2 / M4 完了。 残りは M3 (共有の仕上げ) のみ**:
  - 目的: localStorage → D1 で ITP 7 日問題を根本解消 + 共有のサーバ化。 認証は [[project-famicale-ux]] の**共有編集キー方式** (夫婦 2 人で同じ編集キーを共有、 誰が編集したかは記録しない)。 → **妻との共有・2 人編集が実機で成立済み**。
  - **M1 完了 (2026-07-11)**: migration 0005 で schedules に start_time / end_time / visit_date / visited_date / postponed_from / checklist 追加。 schedules.ts を全フィールド対応 + PUT を全置換方式 (null クリア可、 deferred #3 解消) + title 検証。 POST は id を web から受け取る。
  - **M2 完了 (2026-07-12)**:
    - M2-2: `state/schedules.tsx` を D1 API に配線。 楽観的更新 (ローカル即反映 → 裏で API → 失敗ロールバック、 itemsRef で stale closure 回避)、 呼び出し元は無変更。 tagRegistry は localStorage 継続。 実機で作成 → D1 保存 → リロード残存を確認。
    - M2-4: 編集キー認証。 Worker `requireEditKey` で書き込み (schedules POST/PUT/DELETE, documents POST) を X-Edit-Key 照合保護 (secret `EDIT_KEY`)、 GET は公開。 web は編集キーを localStorage 保持し自動付与。 SharePage に折りたたみ式の編集キー UI (値を隠す、 タップで展開) + 「編集用リンクをコピー」。 App は `?k=編集キー` で開くとキー保存 + URL 除去 → **localStorage が消えてもリンクを開けば復元 (iOS 7 日問題を編集キーでも回避)**。
    - M2-3 (データ移行) は不要だった (テストデータのみ)。
  - **M4 完了 (2026-07-14): 時間割・献立も D1 化**: migration 0006 で timetables (sort_order で並べ替え順) + lunch_tables。 Workers routes は schedules と同じ (GET 公開 / 書き込み編集キー / 全置換)。 state を楽観的更新で配線 + 初回に localStorage→D1 自動移行 (実データ保護、 移行成功まで localStorage 保持)。 LunchTable を shared に移動、 Timetable に sortOrder 追加。 時間割の並べ替えは sortOrder swap で D1 反映。 → **予定・持ち物・時間割・献立すべて D1 で共有される状態に**。
  - **M5 完了 (2026-07-19): 設定画面 + 予定の前日通知 (Web Push)**: `/settings` 新設 (共有 URL・編集キー・通知トグルを集約、 ホーム右上は歯車、 SharePage は廃止)。 通知は毎日 20:00 JST (Cron `0 11 * * *` UTC) に明日が対象日の予定 (visitDate 優先、 中止・visited 除外) を「明日: 〇〇」 で全購読者へ。 構成: public/sw.js (受信・表示・タップで開く) / lib/push.ts (購読、 VAPID 公開鍵) / D1 push_subscriptions (0007) / Worker 送信は @block65/webcrypto-web-push、 秘密鍵は secret VAPID_PRIVATE_KEY。 手動テスト: POST /api/push/test (編集キー保護、 ?reminder=1 で本番ロジック)。 実機 (iPhone PWA) で通知表示まで確認済み。 ⚠️ iOS は Safari と PWA で localStorage が別 → 編集キーは PWA 側にも手動入力が要る (詳細はメモリ project-famicale-environment)。
  - **M3 完了 (2026-07-19): 共有のサーバ化 + 閲覧アクセス制御 → これで v1 完成**: share_tokens (0008) でトークンを D1 照合に (共有 URL が発行端末以外でも機能)。 閲覧 GET は「編集キー or 共有トークン」必須 = URL を知るだけの部外者には見えない。 /api/share (編集キー保護) で発行・失効。 ViewerPage はトークン付き fetch で自己完結。 編集キー未設定端末のホームには赤系バナーで設定導線。 CORS は famicale.pages.dev (+プレビュー/localhost) に絞り済み。 curl 全パターン + 実機 4 フロー検証済み。

  **🎉 v1 完成 (2026-07-19)**: OCR 取り込み / カウントダウン UX / D1 共有 (予定・持ち物・時間割・献立) / 夫婦 2 人編集 (編集キー) / 閲覧専用共有 URL / 前日 20 時 Web Push 通知 / 設定画面。 残地雷は [[project-famicale-deferred-refactors]] (category 列 NULL 据え置き等の小粒のみ)。

  **着手トリガ待ち** (優先度低、 必要が出たらつまむ):
  - **タグ管理画面 S1 + リネーム S2**: 整理ニーズが顕在化したら (今は長押し削除のみ、 発見性低い)
  - **持ち物の前日通知**: D1 移行後に Web Push で。 checklist データはフェーズ 1 のまま使える
  - **時間割の寝かせ案 T1-T6**: 例外日上書き / 持ち物連携 / 学期管理 UI 等、 実運用で苦痛が出たら
  - **献立の OCR 取り込み**: 献立表は極小フォントで vision でも読めないとユーザー判断 (2026-07-02)。 手動入力で運用し様子見
  - **日付未定の覚書** (バックログ #2)、 **公開/非公開フラグ** (#7、 共有 URL 拡張)
  - **イベント時刻のカード表示拡張**: visit pill 内併記等の見せ方調整、 触感次第

注意点:
- localStorage で永続化中。 ITP 7 日問題が継続的リスク ([[feedback_ios_safari_storage]])。 D1 移行で根本解消予定だが優先度未定
- 公開 tunnel (cloudflared quick) は session ローカル。 セッションクリア後は再生成 + URL 共有が必要

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

- **#5 PDF 入力経路追加 (2026-05-30 完了)** — 学校メール添付の PDF を取り込む想定。 server 側で `unpdf` によりテキストレイヤ抽出 → テキストモデル (`@cf/meta/llama-3.1-8b-instruct`) で抽出。 スキャン画像 PDF (テキスト無し) は 422 + `scanned-pdf` で「写真で取り込んで」 に誘導。 抽出ルール/パーサは vision と共有。 詳細は [[project-famicale-ocr]]。
- **献立 (給食メニュー) (2026-07-02 完了)** — 学校別に複数の献立表 (`state/lunch.tsx`、 localStorage)。 `/lunch` で月送り + 平日行の手動入力 (uncontrolled + onBlur)。 管理は NavBar 右上 ✎ + チップ長押し。 ホーム「今日」ブロック (旧・今日の時間割) に給食行を平日常設、 明日の献立があれば「明日·○○」行。 OCR は献立表の極小フォントで断念、 手動運用。
- **持ち物チェックリスト フェーズ 1 (2026-07-02 完了)** — `Schedule.checklist ({name, checked}[])`。 詳細画面「持ち物」セクションで行タップ切替、 追加/削除はタグと同じシート入力。 ホーム今日ブロックに前日準備行 (「明日·遠足 持ち物 残り N 点」)。 前日 Push 通知は D1 移行後。

### 未着手

(元タスクは全て完了。 残りは「機能バックログ」 / トリガ待ちタスクのみ。)

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

- **持ち物 (チェックリスト)** — **フェーズ 1 実装済 (2026-07-02)**。 残タスクは前日 Push 通知のみ (D1 移行後)
- **日付未定の覚書スケジュール** — 「いつか行きたい」リスト的な用途、start_date を nullable にする選択肢あり
- **献立 (給食メニュー) 登録** — **実装済 (2026-07-02)**。 学校別複数表 + 手動入力 + ホーム今日ブロック合流。 給食なし日はレコード無しで表現、 OCR は断念 (極小フォント)
- **時間割登録** — 曜日 × 時限のグリッド。 学期で改訂されるので `valid_from` / `valid_to` 必須。 持ち物機能とセットで詰めると価値が出る (2026-05-17 追加)
- **「イベント期間」 と「自分の行く日」 の分離** — **案 A (visitDate 追加) 実装済 (2026-05-23)**。 兄弟が別日に行くケースは「ほぼ無い」 と確認、 案 B (親子イベント) は不要と判断。 着手トリガ: 兄弟ケースが日常化したら案 B に格上げ
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

## 時間割機能の実装計画 (2026-05-21)

「今日体育あるっけ？」 が買い物中に答えられないニーズが現実に出た (2026-05-21 ユーザー実需要)。 紙で配られる時間割表は famicale の OCR 入力の典型例で、 入力コストの問題は本来の領分。 schedule と独立した新エンティティとして並走させる。

### 前提 / 制約

- お子さん 3 人、 **小中混在** (小学校 + 中学校で時限数 / 曜日数が異なる)
- 異なる学校 = 異なる時間割表 = それぞれ独立した timetable レコードが必要
- 実 OCR は Cloudflare セットアップ後 (別タスク)。 まずは **モック OCR + 手動編集** で動かす
- localStorage で持続 (schedules と同じパターン)。 D1 移行は将来

### データモデル

```ts
interface Timetable {
  id: string
  owner: string           // タグ名と同じ慣習で 「長男」「長女」「次男」 等。 free string
  cells: TimetableCell[]  // sparse: 埋まっているマスだけ持つ (固定サイズ配列ではない)
  validFrom?: string      // ISO date (学期切り替え用、 optional)
  validTo?: string
  source: 'manual' | 'document'
  createdAt: string
  updatedAt: string
}

interface TimetableCell {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6  // 1=月 ... 6=土 (デフォルトは 1-5)
  period: number                     // 1, 2, 3, ...
  subject: string                    // 「体育」「国語」 等
}
```

- **owner = string にする理由**: 既存の対象者タグ運用 (`['長男']` 等) と同じ世界で扱える。 後述 T3 で children エンティティ化に格上げ可能。
- **cells を sparse にする理由**: 小 5-6 時限、 中 6-7 時限の差異を schema 固定せず吸収。 描画側で `max(period)` から行数を出す。
- **validFrom / validTo を optional にする理由**: 期間管理 UI を先送りしたい。 学期切り替えは初期は手動 (古いものを削除して新規追加)。

### 着手スコープ (今回セッション目標)

1. **state**: `timetables.tsx` Provider 新設 (schedules と同パターン)。 localStorage キー `famicale.timetables.v1`
2. **モック OCR**: `mock-ocr.ts` に「サンプル時間割」 1 件追加。 アップロード経路から呼ぶ
3. **週グリッド表示画面**: `/timetables/:id`。 曜日横、 時限縦のグリッド。 cell タップで Sheet 編集
4. **ホーム合流**: 「今日」 ブロックを生やし、 owner 別 mini セクションで時限リスト (`長男: 国・算・体・図・理`)
5. **ナビ**: 既存「履歴」 タブはプリント履歴 stub なので、 これを「時間割」 (or 「今日」) に置き換え

### 発展計画 / 寝かせ案

#### T1. 例外日 (短縮 / 行事振替) の上書き

運動会 / 短縮授業 / 振替で「今日だけ違う」 が出る。 MVP では手動編集に倒す (面倒だが頻度は月 1-2 回)。 将来案:

- 案 i: 特定日付に対する「上書き cell」 を別レコード `timetable_overrides(date, cells[])` に持つ
- 案 ii: schedules 側に「時間割の代わりに表示するイベント」 という関係を持たせる (例: 運動会 schedule に「この日の時間割は無効」 フラグ)

**着手トリガ**: 振替が実運用で頻繁に発生し、 手動編集が苦痛になったとき。

#### T2. 持ち物との連携

時間割の cell に持ち物が紐づくと「体育の日 = 体操服」 リマインダが組める。 [[project-famicale-backlog]] #1 持ち物機能とセット案件。

- データモデル候補: `TimetableCell` に `items?: string[]` 持たせる (単純) / 別テーブル `cell_items` (柔軟)
- ホーム「今日」 ブロックに「持ち物」 が並ぶと、 買い物 / 洗濯チェックの一気通貫が完成

**着手トリガ**: 持ち物機能の検討着手と同期。

#### T3. children エンティティ化

owner: string は「自由文字列、 慣習でタグと一致させる」 設計。 将来摩擦が出たら `children(id, name, color, school)` を first-class にして、 timetable / schedule / 持ち物 が `child_id` を参照する形に格上げ。

摩擦シナリオ:
- タグリネーム (タグの S2 着手後)、 owner string が孤児化
- 「子供別の色 / アイコン」 が欲しくなった
- 同名兄弟の名寄せ問題

**着手トリガ**: タグ機能 M1 (kind 導入) と同期、 もしくは上記摩擦の顕在化。

#### T4. 学期 / 期間管理

`validFrom` / `validTo` は schema にあるが UI は初期は無し。 学期跨ぎ (年 2-3 回) を実運用で扱いたくなったら、 自動切り替えロジックを追加:

- 「現在有効な timetable」 = `validFrom <= today <= validTo` の最新
- 古い timetable は「過去の時間割」 として保存だけ残す (削除しなくて済む)

**着手トリガ**: 学期切り替えで「先学期のが出てる」 等の不便が出たとき。

#### T5. 「イベント期間 vs 行く日」 ([[project-famicale-backlog]] #5) との関係

timetable は schedule とは独立した別エンティティなので、 #5 の解決は本機能に影響しない。 切り離して進めて OK。

#### T6. 実 OCR との切り替え

mock-ocr.ts のサンプル時間割は、 実 OCR (Cloudflare + Claude) が繋がれば自然に置き換わる。 入出力スキーマは `{ cells: TimetableCell[], owner?: string, validFrom?: string }` を返す約束で揃えとけば差し替え自由。

**着手トリガ**: Cloudflare 接続着手と同期。

### 着手判断マトリクス

| 項目 | コスト | 着手判断 |
|---|---|---|
| 着手スコープ 1-5 | 中 | 今 (このセッション) |
| T1 例外日上書き | 中 | 振替の苦痛が顕在化したとき |
| T2 持ち物連携 | 中-大 | 持ち物機能着手と同期 |
| T3 children エンティティ化 | 大 | タグ M1 と同期 or 摩擦発生時 |
| T4 学期管理 UI | 小-中 | 学期跨ぎの不便発生時 |
| T5 (関連のみ) | — | 切り離す |
| T6 実 OCR 接続 | 大 (別領域) | Cloudflare 接続時 |

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
