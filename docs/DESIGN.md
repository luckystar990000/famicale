# ファミカレ デザインシステム

UI を書き換える/新画面を追加するときの統一指針。**ファミカレに新しい UI を足すときは必ずこのドキュメントに従う**。背景・色・コンポーネント・パターンが本ドキュメントから外れる場合は、まず本ドキュメントを更新してから実装する。

---

## デザイン言語

**iOS 18+ HIG (Human Interface Guidelines) + Liquid Glass 風**

- ベース: iOS 18 系の「設定アプリ」「Wi-Fi 画面」スタイル (グループリスト、丸い半透明ボタン、ピル型カプセル、ラージタイトル)
- 装飾: Liquid Glass を Web で再現 — パステルグラデーション背景 + 半透明 + backdrop-filter + 内側ハイライト

---

## レイアウト原則

- 画面コンテナ最大幅: **480px**、中央寄せ
- 横パディング: **16px** (リストカード等)、**20px** (本文ヘッダー、ヒーロー)
- 縦余白: 各セクション間 **24-28px**、行内 **11-14px**
- セーフエリア: 全画面で `env(safe-area-inset-*)` を尊重 (ノッチ / ホームバー / 横向き対応)

---

## カラーパレット (`index.css` の CSS 変数)

```
--tint              : #007aff   (iOS 標準ブルー / プライマリアクション)
--bg-base           : linear-gradient(165deg, #ffd6e7, #d4c5ff, #b8d8ff, #c5f0ee)
--bg-grouped        : #f2f2f7   (フォールバック平面)
--bg-card           : rgba(255,255,255,0.62)  (ガラスカード)
--bg-card-solid     : #ffffff   (透けが邪魔なときの不透明)
--glass-border      : rgba(255,255,255,0.55)
--glass-inner-hi    : rgba(255,255,255,0.75)
--separator         : rgba(60,60,67,0.18)
--label             : #1c1c1e
--label-secondary   : rgba(60,60,67,0.62)
--label-tertiary    : rgba(60,60,67,0.32)
--grouped-header    : rgba(60,60,67,0.58)
--destructive       : #ff3b30   (削除 / 危険アクション)
```

**新しい色は基本足さない**。状態色だけ別途下記。

---

## イベント状態と色

イベントは `event-status.ts` の `EventStatus` で 6 状態に分類:

| status         | accent  | 意味                            |
| -------------- | ------- | ------------------------------ |
| upcoming-soon  | `#f59e0b` (黄) | 開始 3 日以内                  |
| upcoming       | `#f59e0b` (黄) | 開始まで余裕あり               |
| ongoing-today  | `#10b981` (緑) | 当日・単日                     |
| ongoing        | `#10b981` (緑) | 開催中・終了まで余裕あり        |
| ending-soon    | `#10b981` (緑) | 開催中・終了 3 日以内 (バッジで強調) |
| past           | `#9ca3af` (灰) | 終了                          |
| cancelled      | `#9ca3af` (灰) | 中止                          |

**ルール**: 「やってる/これから/終わった」の三軸を **アクセント色 (左バー・ゲージ・ヒーロー色)** で表現する:

- **緑** = やってる (ongoing 系すべて)
- **黄** = これから (upcoming 系すべて)
- **グレー** = 終わった / 中止

これは絶対遵守。ユーザーが「やってる/やってないが一瞬で判断したい」と明示した制約 ([[feedback-minimum-required-inputs]] とは別の根強い要件)。

---

## バッジ色

カード右側の状態バッジは、**切迫度** を別途色で示す:

| 状態          | バッジ色 (text/bg)            | ラベル              |
| ------------ | ----------------------------- | ------------------ |
| upcoming-soon | 青 `#1e40af` / `#dbeafe`     | 開始まで N 日 + **pulse** |
| upcoming      | 黄 `#92400e` / `#fef3c7`     | 開始まで N 日       |
| ongoing-today | 緑 `#065f46` / `#d1fae5`     | 今日                |
| ongoing       | 緑 `#065f46` / `#d1fae5`     | 終了まで N 日       |
| ending-soon   | 赤 `#991b1b` / `#fee2e2`     | 終了まで N 日 + **pulse** |
| past          | 灰 `#6b7280` / `#f3f4f6`     | 終了                |
| cancelled     | 赤系 `#991b1b` / `#fee2e2`   | 中止                |

**pulse**: `badge-pulse` クラスで `1.6s` 周期のフワッと明滅 (opacity + scale)。`prefers-reduced-motion` で停止。

---

## ゲージ (カードの 4px バー)

- 表示位置: カード下端、`height: 4px`
- 30 日基準
- **塗り方向**:
  - 開始前 → **右寄せ** (右から左に満ちる、当日に近づくほど満タン)
  - 開催中 → **左寄せ** (左から、終わりに近づくほど右が削れる)
  - 当日(単日) → 満タン
  - 過去/中止 → 表示なし
- アクセント色は状態色と同じ

「右から満ちる / 右から削れる」はユーザー要望に基づく確定仕様。変更不可。

---

## コンポーネント

### NavBar (`components/NavBar.tsx`)

- 高さ 48px + セーフエリア
- 背景: 半透明白 `rgba(255, 255, 255, 0.65)` (やや透けるくらい)
- **境界線は引かない**。背景の透明度差だけで自然に区切る。
- iOS 26 Safari の制約で sticky 要素への `backdrop-filter` blur は効かないので、ガラスは諦めて素直な半透明白で運用 (project-famicale-environment 参照)。
- TabBar は別ルートで本物のガラス化済み (下記 TabBar 節参照、 sticky ではなく `position: absolute` なのでブラーが効く)。
- **レイアウトは三段グリッド** (`gridTemplateColumns: '1fr auto 1fr'`): 左 戻る / 中央 タイトル / 右 アクション
- **タイトルは必ず中央寄せ** (`justifySelf: center`)、`maxWidth: 60vw` + `text-overflow: ellipsis`
- **戻るボタン (back)**:
  - `icon: 'chevron'` (default): 半透明白丸 (34x34) + `‹` (通常の戻る)
  - `icon: 'close'`: 半透明白丸 (34x34) + `✕` (灰色) — 編集/新規追加など「破棄して閉じる」モード用
- **右アクション (rightAction)**:
  - `icon: 'check'`: 青い丸 (34x34) + 白い `✓` — 編集/新規追加など「確定」用。`disabled` ならグレー丸 + グレー ✓ + シャドウ無し
  - `icon` 未指定: ピル型カプセル + テキスト。`primary` で tint+bold、`destructive` で赤、`disabled` で灰
- **`close + check` の組み合わせは編集/新規追加モード専用** (iPhone 設定アプリの編集モードと同じ)。通常の戻る+テキストアクションは詳細画面など普段の画面用。

### TabBar (`App.tsx` 内)

iOS 26 風の **浮き島ガラスカプセル**。 画面下に float し、 コンテンツがバー下を流れて blur が効く。

- レイアウト: `position: absolute`、 `left: 12 / right: 12`、 `bottom: calc(env(safe-area-inset-bottom) + 10px)` で浮かす
- `main` (`overflow-y: auto`) には `padding-bottom: calc(env(safe-area-inset-bottom) + 84px)` を入れて、 末尾のコンテンツがバー後ろに隠れないようにする
- **絶対配置だから iOS 26 Safari でも blur が効く** (sticky/fixed と違って Liquid Glass エンジンと衝突しない、 [[project-famicale-environment]] 参照)。 NavBar (sticky) とは別ルート。
- 容器: ピル (`border-radius: 999`)、 半透明白 0.55 + blur 28 + 0.5px ガラスボーダー + 内側上端ハイライト + 落ち影 (`0 10px 30px rgba(0,0,0,0.12)`)
- 内側 padding 6、 NavLink 4 つを `flex: 1` で等分配
- 各 NavLink: padding `8px 0 6px`、 アイコン (22px / strokeWidth 2) + ラベル (10px) を縦に積む
  - アクティブ: 文字 `var(--tint)` + 600、 背景 `rgba(0, 122, 255, 0.12)` のピル
  - 非アクティブ: 文字 `#8e8e93` + 500、 背景透明
- **viewerMode (`/v/:token`) では描画しない** (閲覧者にナビ UI を見せない)。 main の paddingBottom も `env(safe-area-inset-bottom)` のみに切り替える。

### ListSection / ListRow (`components/List.tsx`)

- iOS 26 設定アプリ風グループリスト
- セクションは横マージン 16px、内側に複数 ListRow
- カード: 半透明白 + blur、内側上端ハイライト、薄縁取り、軽い落ち影、`overflow: hidden`
  - **複数行のとき**: `border-radius: 18px`
  - **単一行のとき**: `border-radius: 999` で完全ピル化 (iOS 26 設定の「アプリ」など単独行の見せ方に合わせる)。 `Children.count(children) === 1` で自動判定
- **セパレーター (区切り線)**:
  - 実装: `index.css` の `.ios-list > *:not(:first-child)::before` で擬似要素として描画
  - 太さ: 1px に `transform: scaleY(0.5)` で Retina 1 device pixel のシャープな線
  - 色: `var(--separator)` = `rgba(60, 60, 67, 0.36)`
  - 位置: **左 20px / 右 20px インデント** (行 padding と揃える、 左右対称、角丸を貫通せず自然に止まる)
  - 各 ListRow には `border-top` を持たせない (擬似要素任せ)
  - 最初の行 (`:first-child`) には線を描画しない
- 行高さ: `min-height: 54px` (iOS 26 設定アプリの行高さに合わせて余裕を持たせる、 タップターゲットは 44px を確保)
- 行 padding: `14px 20px` (横は 16 → 20 に拡大して iOS 26 寄りの余白感)
- 行レイアウト: 水平 (ラベル左/値右) または 垂直 (ラベル上/コンテンツ下)
- 行 `overflow: hidden` で内側コンテンツのはみ出しを防ぐ
- `destructive` で赤テキスト、`onClick` を渡すと押下フィードバック付きボタンに

### SegmentedControl (CountdownPage 内)

- iOS 18 風タブ
- 背景ガラス + 内側ハイライト
- アクティブセグメントは白で浮く (`inset shadow + ドロップシャドウ`)
- 内容ベース可変幅 (`flex: 0 0 auto`)
- 件数バッジは小さく `tabular-nums`

### ブロック構成ルール (全画面共通)

ファミカレの全画面は、 縦に並ぶ **ブロック** の集合として組み立てる。 ブロック = 視覚的にまとまった一つの単位 (ヒーロー、ListSection、検索バー、SegmentedControl + TagFilter のフィルタ群、 カードリスト、 ボタン群、 など)。

- **ブロック間は 16px** の余白で区切る (ListSection の `marginBottom: 16` で統一)
- **ブロック内は密** (6〜8px、 ListRow 間の擬似要素罫線、 SegmentedControl と TagFilter は marginTop マイナスで吸い寄せる)
- 新しい UI 要素を足すときも必ずいずれかのブロックに属させる。 ブロック間の中途半端な位置に置かない。

#### 各画面のブロック例

- **ホーム (CountdownPage)** の 3 ブロック:
  1. 検索ブロック: ラージタイトル + サブ日付 + 共有ボタン + SearchBar
  2. フィルタブロック: SegmentedControl + TagFilter (タグが 1 つ以上ある時のみ、 内側密)
  3. カードブロック: イベントカードのリスト + 「終わったイベント」折りたたみ
- **イベント詳細 (EventDetailPage)**: ヒーロー / 日付 / メモ / タグ / 中止 / 削除 の ListSection 群
- **新規追加・編集 (EventForm)**: イベント名 / 日付 / タグ / メモ の ListSection 群
- **共有 (SharePage)** / **撮影 (UploadPage)**: 説明 + アクションボタン / DropArea + 結果リスト

#### ブロック間隔のメンテ

- ListSection は内側で `marginBottom: 16` を持つので、 ListSection を並べれば自動で 16px。
- ヒーロー直下 / NavBar 直下にも 16px 程度の上 padding を入れる (現状 paddingTop: 16)。
- SegmentedControl と TagFilter は 「フィルタブロック」 という 1 ブロックなので、 間は `marginTop: -8` で密に吸い寄せる。

### SearchBar (CountdownPage)

- 横置きピル: 背景 `rgba(120, 120, 128, 0.12)`、 高さ 36、 角丸 10
- 左 `Search` アイコン (16, strokeWidth 2.2、 color: var(--label-tertiary))
- 右に値があれば灰色丸の `X` クリアボタン
- placeholder「イベントを検索」、 部分一致 (タイトル/メモ/タグ、 大文字小文字無視)

### TagFilter (CountdownPage)

- 横スクロール (`overflow-x: auto`、 `scrollbarWidth: none`) の chip 並び
- 先頭に「全て」 chip、 次に各タグ chip
- アクティブ: tint ベタ + 白文字 + 600 ウェイト、 非アクティブ: **半透明白ガラスピル** (0.55 + blur 14 + 内側ハイライト + 0.5px glass border) + label 色 (iOS 13 風の outline + 透明には戻さない)
- 状態は **URL クエリ `?tag=長男`** で管理 (戻る / 共有可能、 useSearchParams)
- カードのタグ chip タップでも同タグで絞り込み (button + `stopPropagation` で詳細遷移を抑止)
- 詳細画面のタグ chip は `<Link to="/?tag=...">` でホーム遷移しつつ絞り込み

### イベントカード (CountdownPage の EventCard)

- 横並び: `[StatusDot] [タイトル + 日付] [Badge] [›]`
- StatusDot (24x24 円):
  - 開催中系 → **塗りつぶし**
  - 開始前系 → **空のリング**
  - 終了 → 塗りつぶし + `✓` (白)
  - 中止 → 塗りつぶし + `×` (白)
- ガラスカード、押下フィードバック (`press-feedback` クラス)
- カード末尾にゲージ (上記参照)
- カード内容の縦並び: **タイトル → 日付 → メモ (2 行 line-clamp) → タグ chips**
  - メモは `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-wrap` で 2 行で切り捨て、 余りは `...`
  - タグ chips は button 化、 タップで同タグ絞り込み (Link クリックを抑止)
  - カード内タグ chip: 背景 `rgba(0, 122, 255, 0.12)`、 文字 `var(--tint)`、 fontSize 11、 padding 2px 8px、 角丸 999

### Empty 表示 (絞り込み 0 件)

- 中央に小さくメッセージ (`emptyMessage(tab)`)
- `selectedTag` がある場合は副文「『◯◯』タグで絞り込み中」+ tint のピルボタン「タグの絞り込みを解除」 を併記
- ボタンのアクションは selectedTag のみクリア (タブ / 検索クエリには触らない、 文言にも主語「タグの」 を入れる)

### イベント詳細ヒーロー (EventDetailPage)

- タイトル (24px bold、 タップで Sheet 編集) → ラベル → 大数字 (`bigNumber.length > 2` なら 42px、 そうでなければ 64px + tabular-nums + accent 色) → 単位 → サブ
- アイコン枠は使わない (カレンダー誤読防止)
- **当日系** (ongoing-today / ending-soon 0日 / past / cancelled) は ラベル・サブを空にして、 大表示 (「今日」 / 「本日終了」 / 「終了」 / 「中止」) のみ
- **数字系** (upcoming, ongoing) はラベル + 大数字 + 単位 + サブの構造
- タグは独立 ListSection「タグ」 で chip 表示、 各 chip は `<Link to="/?tag=...">` でホームに遷移しつつ絞り込み (Sheet 編集を呼ぶ親 ListRow とは `stopPropagation` で分離)

### Sheet (`components/Sheet.tsx`)

iOS 26 リキッドグラス風のボトムシートモーダル。 詳細画面の各フィールドのインライン編集に使う。

**iOS 13-16 風の「キャンセル / タイトル / 保存」テキスト 3 段グリッド + 区切り線ヘッダにはしない**。 iOS 26 ではシートのヘッダはテキストではなく **左上の閉じる円形ガラスボタン (✕) + 右上の確定円形ソリッドボタン (✓)** に揃え、 タイトルは本体の大見出しとして配置する。

- 構造: backdrop (半透明黒 0.32) + シート (下から slide-up、 角丸上端 24px、 セーフエリア対応、 最大高さ 85dvh)
- シート背景: **リキッドグラス** — `rgba(255, 255, 255, 0.55)` + `backdrop-filter: saturate(180%) blur(28px)` + 内側上端ハイライト + 0.5px ガラスボーダー (`var(--bg-grouped)` のソリッド背景には戻さない)
- ヘッダ: `flex space-between`、 上下 padding 12 / 横 16
  - 左: 閉じる円形ガラスボタン (34x34、 NavBar の `icon: 'close'` と同じ規格、 `X` アイコン 18px、 `var(--label-secondary)`)
  - 右: 確定円形ソリッドボタン (34x34、 NavBar の `icon: 'check'` と同じ規格、 tint ベタ塗り + 白 `Check` 20px、 disabled でグレー)
- 本体: scroll 可能領域、 padding `12px 20px 20px`、 先頭に大見出し (`h2` 22px / 700 / `letter-spacing: -0.2`)、 続けて編集 UI
- アニメ: `transform: translateY(100%)` ↔ `translateY(0)` を `cubic-bezier(0.22, 1, 0.36, 1)` で
- **必ず `createPortal(..., document.body)` で body 直下にレンダリング**。 iOS Safari は `main` (`overflow-y: auto`) の子の `position: fixed` を viewport 基準にしないバグがあり、 Portal で外に出さないと TabBar や Safari UI と被る。
- ヘッダボタンの規格を変える場合は **必ず NavBar の `circleBtn` / `check 円形` と揃える** (シートとナビバーで挙動が割れない)。

### AlertDialog (`components/AlertDialog.tsx`)

iOS 26 設定アプリ風の中央アラート (リキッドグラス)。 破壊的アクション (削除 / 無効化 / 取り消し不能な操作) の確認に使う。 **ブラウザ標準の `confirm()` / `alert()` は使わない** (見た目が OS デフォルトでガラス感が崩れる)。

**iOS 13-16 風の「縦罫線で結合されたボタン」レイアウトにはしない**。 iOS 26 から確認モーダルは **独立したガラスピルボタンを横並びにギャップで分離** するレイアウトに変わっている (`設定` アプリの Wi-Fi 削除確認等)。 ファミカレもこれに揃える。

- 構造: 全画面 backdrop (半透明黒 0.28) + 中央カード (`max-width: 320`、 `border-radius: 28`、 ガラス背景 + 強めの blur 32px + 内側上端ハイライト + 落ち影)
- カード内 padding 16px
- ヘッダ部: タイトル 17px / 600 / 左寄せ、 メッセージ 13px / `--label-secondary` / 左寄せ (中央寄せにしない、 iOS 26 は左寄せ)、 上下 padding 12/18
- アクション部: **左右 2 ボタンを `gap: 10` の 2 カラムグリッド**。 区切り線は引かない。
- ボタン (キャンセル / 確定 共通):
  - **ピル型ガラスカプセル** — `border-radius: 999`、 高さ 50px、 半透明白 0.7 + blur 14px + 内側上端ハイライト
  - キャンセル: `--label` 色、 weight 400
  - 確定: weight 600、 `destructive` 指定で `var(--destructive)`、 既定は `var(--tint)`
- backdrop タップ / Escape キーでキャンセル扱い
- **必ず `createPortal(..., document.body)` で body 直下にレンダリング** (Sheet と同じ理由)
- 用途例:
  - EventDetailPage: イベント削除確認 (`destructive`、 確認ラベル「削除」)
  - SharePage: 共有 URL 無効化確認 (`destructive`、 確認ラベル「無効化」)

### フィールド編集パターン (EventDetailPage)

詳細画面の各ブロックは **タップで Sheet 編集** に統一する (「右上の編集ボタン」 だけに頼らない、 中止/削除と並ぶアクセス性に揃える):

- ヒーローのタイトル → タイトル編集 sheet (text input)
- 「日付」 ListSection の各 ListRow → 開始日 / 終了日 編集 sheet (date input、 終了日 sheet には「未設定にする」ボタン)
- 「タグ」 ListSection → タグ編集 sheet (TagInput + 候補 chip)。 chip タップ自体は ホーム絞り込み Link、 親 ListRow タップで編集
- 「メモ」 ListSection → メモ編集 sheet (textarea)。 未入力でも ListRow は表示し、 「未入力」 placeholder

実装: ローカル `editing` state で開いてる sheet を特定、 `draftText` / `draftTags` で一時値を保持、 保存で `update()` 呼び出し、 キャンセル / backdrop タップで破棄。 編集画面 (EventEditPage) はホーム新規追加用、 詳細画面では使わない。

### フォーム (EventForm)

- Settings 風: 入力欄はカードの中、罫線区切り
- 必須は **タイトル + 開始日** のみ ([[feedback-minimum-required-inputs]])
- 終了日のクリアボタン: 入力欄内 (right: 0)、丸 24x24、灰色塗り + 白 ×
- 入力欄は枠線なし、フォントサイズ 17px、`line-height: 1.3`、`text-align: left` 強制

---

## ガラス効果のレシピ

新しい浮遊要素を作るとき、以下を組み合わせる:

```css
background: rgba(255, 255, 255, 0.45 〜 0.62);
backdrop-filter: saturate(160% 〜 180%) blur(14px 〜 28px);
-webkit-backdrop-filter: 同上;
border: 0.5px solid rgba(255, 255, 255, 0.55);
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.55 〜 0.75),  /* 上端ハイライト */
  0 4px 18px rgba(0, 0, 0, 0.05 〜 0.08);            /* 浮き影 */
border-radius: 10 〜 14px;
```

- 透明度は **大きい面ほど高く** (NavBar/TabBar は薄め 0.45)、**小さい要素ほど不透明寄り** (ボタン 0.55+)
- blur は **大きい面ほど強く** (28px)、ボタン等は 14px
- 文字の可読性が下がるときは `--bg-card-solid` (不透明白) にフォールバック

### ボタン形状の使い分け

| 用途 | 形 | 例 |
| --- | --- | --- |
| 通常の戻る / 設定アイコン | **円形ガラスボタン (34x34)** + 半透明白 + blur | NavBar `chevron`, ホームの ⤴ |
| キャンセル (破棄して閉じる) | **円形ガラスボタン (34x34)** + 灰色 ✕ | NavBar `close` |
| 確定アクション (保存/追加) | **円形ソリッドボタン (34x34)** + tint 色 + 白 ✓ + tint シャドウ | NavBar `check` (primary 確定) |
| 通常テキストアクション (詳細画面の「編集」など) | **ピル型ガラスボタン** (高 34、padding 16) + テキスト | NavBar 通常 rightAction |
| プライマリ CTA (画面下の大きい確定) | フル幅 / 2:1 比率の **ピル型ボタン** (radius 999)、tint ベタ塗り + tint シャドウ。 セカンダリは半透明白ガラス + 内側上端ハイライト。 | SharePage の「発行する」、 UploadPage の「AI で読み取る」「やり直す」 |
| リスト行内のクリア・小操作 | **小さい円形ボタン (24x26)**、灰色 or 赤系 | EventForm の終了日 ✕ |

- 円形系は常に半透明白 + blur で「浮き感」、ソリッド系は tint 色 + drop shadow で「目立ち感」
- disabled 時は背景を灰色 (`rgba(120, 120, 128, 0.16)`) + 文字を `--label-tertiary`
- ピル型カプセル (`pillBtn`) と円形 (`circleBtn`) は同じ高さ 34px で揃える (ナビバー内の縦中央が揃う)

### 区切り線の規則

- セパレーターを引きたいときは **常に CSS 擬似要素** で実装 (`border-top` で直に引かない)
- 規則: `.ios-list > *:not(:first-child)::before` を使う、または同等の構造
- 太さ: `height: 1px` + `transform: scaleY(0.5)` で Retina 0.5px (デバイスピクセル単位の 1 本線)
- 色: 必ず `var(--separator)` を使う (他の色を新設しない)
- 位置: **左 16px / 右 16px インデント** (両端対称、角丸を貫通させない)
- 先頭行・末尾行には引かない
- ListSection の外で線が必要な場合 (例: ヘッダー下) も同じレシピ + 色を流用すること

### アイコンの規則

- **アイコンは `lucide-react` で統一**。ユニコード文字 (`✓` `×` `‹` `›` `⌂` `＋` 等) を直接書かない。絵文字 (`🔒` `📄`) も UI 用途では使わず Lucide に置き換える。
- React コンポーネントとして使う: `import { Check, X, ChevronLeft } from 'lucide-react'`
- props で size / strokeWidth / color を制御 (CSS 変数を渡せる)
- 用途別の標準サイズと strokeWidth:

| 用途 | size | strokeWidth | 例 |
| --- | --- | --- | --- |
| ボトムタブ | 24 | 2 | `House`, `Plus`, `Camera`, `List` |
| NavBar 戻る (chevron) | 22 | 2.5 | `ChevronLeft` |
| NavBar 確定 (check 円形) | 20 | 3 | `Check` |
| NavBar 閉じる (close 円形) | 18 | 2.8 | `X` |
| カード末尾シェブロン | 18 | 2.2 | `ChevronRight` |
| 共有・補助円ボタン | 18 | 2.2 | `Share2`, `Settings` |
| ステータスドット内 (24x24 円) | 14 | 3.5 | `Check`, `X` |
| 入力欄内クリア (24x24 円) | 14 | 3 | `X` |
| ヒーローアイコン (72x72 ブロック) | 32 | 2.2 | `Lock` |
| インラインバッジ | 12 | 2.2 | `Eye`, `Lock` |

- **`color` には常に CSS 変数を渡す**: `color="var(--label)"`、`color="var(--label-secondary)"`、`color="var(--tint)"`、`color="var(--destructive)"`、`color="#fff"` (色付き背景の上のみ)
- 新しいアイコンを追加するときも上記サイズ表のレンジに収める (バラつかせない)

---

## タイポグラフィー

| 用途                  | size  | weight | color                  |
| -------------------- | ----- | ------ | ---------------------- |
| Large title (画面頭) | 34    | 700    | var(--label)           |
| 詳細ヒーロー大数字     | 64    | 700    | accent (状態色)        |
| 画面タイトル (NavBar) | 17    | 600    | var(--label)           |
| カード見出し          | 16-17 | 600    | var(--label)           |
| 本文                  | 17    | 400    | var(--label)           |
| サブテキスト          | 13-15 | 400    | var(--label-secondary) |
| バッジ                | 11    | 600    | (バッジ色表参照)        |
| キャプション・補助     | 11-13 | 400-500 | var(--label-tertiary)  |

- フォントファミリー: `-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif`
- 数字は **`fontVariantNumeric: 'tabular-nums'`** を使う (桁ずれ防止)

---

## インタラクション

- **タップフィードバック**: クリッカブルな要素には `press-feedback` クラスを当てる (背景が一瞬薄グレー)
- **モーション抑制**: `prefers-reduced-motion: reduce` で `badge-pulse` 停止 (アクセシビリティ)
- **遷移**: ホーム/詳細間は URL 遷移 (戻る/共有可)、フォームは push 遷移、保存後は `navigate(..., { replace: true })`
- **入力欄の zoom 抑止**: 全ての `<input>` `<textarea>` で `font-size: 16px` 以上
- **ピンチズーム抑止**: 全画面で `maximum-scale=1.0` (meta viewport)

---

## ナビゲーション構成

- ボトムタブ 4 つ: `ホーム / 追加 / 撮影 / 履歴`
- 各タブはユニコード記号で代用 (将来 SF Symbols 風のアイコンに差し替え予定)
- ナビバーは画面ごとに `NavBar` コンポーネントを使う (ホームのみ NavBar なし、ラージタイトル直置き)
- 戻るボタンは `to` 指定なら `navigate(to)`、なければ `navigate(-1)`

---

## やってはいけないこと

- **状態を排他カテゴリで色分けしない** (例: 学校=青、遊び=オレンジ等)。状態色は「やってる/これから/終わった」の三軸専用。
- **必須項目を増やさない** ([[feedback-minimum-required-inputs]] 参照)。タイトル + 開始日以外を必須化しない。
- **iOS 13-16 風の "影と枠線" デザインに戻さない**。常に半透明 + blur + 内側ハイライトでガラス感を維持。
- **赤を警告以外で使わない**。upcoming-soon は黄、ending-soon バッジだけ赤 (本当に切迫してる時のみ)。
- **アイコン枠の中に数字を入れない** (カレンダーアイコン誤読の元)。数字はバッジか大数字ヒーローへ。
- **タップ可能領域を 44x44 未満にしない** (HIG 準拠)。
- **セパレーターを `border-top` でべた塗りしない**。必ず擬似要素 + scaleY(0.5) + 左右 16px インデント。
- **NavBar のタイトルを左寄せにしない**。常に三段グリッドの中央 (`justifySelf: center`) に置く。
- **編集/新規追加のナビバー右ボタンをテキスト「保存」「追加」にしない**。常に `icon: 'check'` の円形 ✓ アイコンボタン。テキスト型は詳細画面の「編集」のような副次アクション専用。
- **編集/新規追加の戻るボタンを `chevron` (‹) にしない**。常に `icon: 'close'` の ✕ アイコンボタン (「破棄して閉じる」のメタファー)。`chevron` は階層遷移 (詳細→一覧など) 専用。
- **新しい色や線スタイルを CSS 変数化せずに直書きしない**。`--tint`, `--separator` などを必ず使い、新色は `:root` に変数を追加してから利用する。
- **新しい円形ボタン・ピルボタンを独自に書かない**。`circleBtn` / `pillBtn` を再利用するか、同等の規格 (34px 高さ・半透明白・blur) で作る。
- **アイコンにユニコード文字や絵文字を直書きしない**。常に `lucide-react` のコンポーネントを使う (バラついた線の太さ・サイズを生まない)。
- **NavBar (sticky) には backdrop-filter blur を入れない**。 iOS 26 Safari で動かない (sticky 親に直接 / absolute child パターン両方試行済み)。 NavBar は素直な半透明白 0.65 + 線なしで固定。 詳細は [[project-famicale-environment]]。 TabBar は `position: absolute` 経由で別ルートでガラス化しているので例外。
- **ブロック間隔を 16px から外さない**。 ListSection を並べたら自動的に 16px。 個別画面で `marginBottom` を上書きして 28 や 40 に戻さない。
- **Sheet モーダルを Portal なしで使わない**。 必ず `createPortal(..., document.body)`。 main の overflow から逃がさないと iOS Safari で位置が壊れる。
- **詳細画面の編集を「右上ボタンだけ」 に閉じない**。 各フィールドの ListRow / ヒーローは直接タップで Sheet 編集できるようにする (中止/削除と同じアクセス性)。
- **破壊的操作の確認に `window.confirm()` / `window.alert()` を使わない**。 必ず `AlertDialog` コンポーネントを使う (OS デフォルトの白いダイアログはガラス感を壊し、 iOS 設定アプリのトーンとも外れる)。
- **Sheet / AlertDialog のヘッダにテキスト「キャンセル」「保存」ボタンを並べない**。 iOS 13-16 風レイアウト。 必ず円形ガラス ✕ + 円形ソリッド ✓ (NavBar の `close` + `check`) に統一する。 タイトルはヘッダ中央ではなく本体の大見出しとして配置する。

## iOS 26 Safari の既知制約

- `position: fixed` / `sticky` の要素に **直接** `background + backdrop-filter` を当てると、 iOS 26 の Liquid Glass エンジンと衝突してブラーが効かない (2026-05-17 検証済み)。
- 回避策 (未検証だが文献あり): sticky/fixed 要素の中に `position: absolute; inset: 0` の子要素を作って、 そちらに `background + backdrop-filter` を当てる。
- 詳細は memory `project-famicale-environment` 参照。
- **モーションを `prefers-reduced-motion` 無視で派手にしない**。

---

## 変更時の注意

- 新画面/新コンポーネントを足すときは、本ドキュメントのコンポーネント節に追加する。
- 色を増やすときは、CSS 変数化して `index.css` の `:root` に追加してから使う。
- リキッドグラスの透明度や blur 強度を変えるときは、本ドキュメントのレシピ節も更新する。
- ユーザーから新しいデザイン要求が来たら、本ドキュメントとの整合性を確認してから着手する。

---

## 関連

- ユーザーメモ: `project-famicale-ux` (UX 軸)、`feedback-minimum-required-inputs` (入力最小化)
- 実装ファイル: `apps/web/src/index.css`、`apps/web/src/components/`、`apps/web/src/lib/event-status.ts`
- 計画: `famicale/PLAN.md`
