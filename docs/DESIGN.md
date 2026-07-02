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

### 角丸の統一ルール

**全てのコンテナ要素 (カード / モーダル / 検索フォーム / フィルタ / SegmentedControl / 入力欄 / アイコン背景) は `border-radius: 27px` で統一**する。 ListRow の `min-height: 54` の半分なので:

- 短い要素 (検索バー 36 高さ、 ListRow 単独 54 高さ、 SegmentedControl など) → ブラウザが radius を半分でキャップして **自然にピル化**
- 高い要素 (タグ入力やメモ textarea を含む ListSection、 イベントカード) → 同じ R のままの **角丸長方形**

ピル意図のボタン (CTA、 TabChip、 TagFilter chip、 NavBar 円形ボタン) は `border-radius: 999` のまま。 サークル (X クリア丸、 StatusDot 等) も既存値 (`999` / `50%`)。 ゲージや極薄バーは別途 `3px` 等。

**例外を作らない**。 「単独行のとき 999、 複数行のとき 18」 のような条件分岐は禁止 ([[feedback-simple-code]])。 縦に伸びた単独行が完全ピル化する不格好を生む。

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

### 「行く日」 pill (CountdownPage / ViewerPage)

`schedule.visitDate` が set のイベントには、 ホーム/閲覧カードの日付テキストの左に **紫 pill** で「行く日」 を表示。 視覚的に「これは自分が行く日が決まってる外部イベント」 と一目で識別できるようにするマーカー。

- 文字色 `#af52de` (iOS 標準パープル)、 背景 `rgba(175, 82, 222, 0.14)`
- 11px / weight 700 / capsule
- タグ chip (青系) と色が衝突しないので、 同じ行に並んでも区別できる
- カード本体の日付テキストは `visitDate` の単日表示、 その下に補足で「○月○日 〜 ○月○日」 を `--label-tertiary` で小さく出す (`endDate` set 時のみ)

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
  - `icon: 'chevron'` (default): 半透明白丸 (44x44) + `‹` (通常の戻る)
  - `icon: 'close'`: 半透明白丸 (44x44) + `✕` (灰色) — 編集/新規追加など「破棄して閉じる」モード用
- **右アクション (rightAction)**:
  - `icon: 'check'`: 青い丸 (44x44) + 白い `✓` — 編集/新規追加など「確定」用。`disabled` ならグレー丸 + グレー ✓ + シャドウ無し
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
  - `border-radius: 27px` で**全セクション統一** (= 行 `min-height: 54` の半分)。 iOS 26 設定アプリと同じ仕組みで、 短い単独行は自然にピル化し、 多行/高い行は同じ R のまま角丸長方形になる
  - **絶対に「単一行のとき 999、 複数行のとき 18」のような条件分岐をしない**。 タグ入力やメモ textarea のような縦に伸びる単独行が完全ピル化されて不格好になる ([[feedback-simple-code]])
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

### SegmentedControl (components/SegmentedControl.tsx、 CountdownPage / ViewerPage 共有)

- iOS 18 風タブ
- 背景ガラス + 内側ハイライト
- アクティブセグメントは tint ベタ + 白文字 (`0 1px 4px` の tint シャドウ)
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

### イベントカード (components/EventCard.tsx、 CountdownPage / ViewerPage 共有)

カードを **Header / Gauge / Body / Footer** の 4 ブロックに分けて構造化する。 ガラスカード、押下フィードバック (`press-feedback`、 `to` 付き = Link のときのみ)、角丸 `border-radius: 27px`。 タブ定義 / inTab / sortForTab / emptyMessage は `lib/event-filters.ts` に共有。 閲覧モード (ViewerPage) は `to` / `onTagClick` を渡さず、 遷移なし + タグ chip は飾りになる。

- **Header** (padding `12px 16px`): 左にタイトル (16px / 600 / 1 行 ellipsis、 flex: 1)、 右にバッジ。 背景は `cardHeaderBg(status, cancelled)` で **状態色 alpha 0.06** (緑 / 黄 / 灰) を弱く敷く → リスト全体で 緑塊 / 黄塊 / 灰塊 のグルーピング感が出る。 cancelled なら title を line-through + バッジを「中止」 赤系。
- **Header 右バッジの 2 形態**:
  - **visit pill** (visitDate set + active): 紫 pill (`rgba(175, 82, 222, 0.16)` / `#af52de` / 13px / 700)。 中身は inline-flex で「行く日」 (11px) + 日付 (13px / 強調) + countdown tail (11px、 例: 「あと 22日」 / 「今日」 / 「昨日」 / 「N日前」) の 3 パート。 ending-soon / upcoming-soon は `badge-pulse` で明滅
  - **通常 badge** (visitDate not set または cancelled): `statusBadge(status, schedule)` の色 (緑 / 黄 / 赤 / 灰)、 「開始まで N 日」「今日」 等。 cancelled は赤系「中止」 / past は灰「終了」
- **Gauge** (height 4px、 Header と Body の境界): カード末尾ではなく **Header と Body の間** に置く。 末尾配置だとカード角丸 R に重なって違和感が出ていた問題の解消 (2026-05-24)。 gauge が無い状態 (past / cancelled) も **空のトラックバー** (`rgba(0,0,0,0.05)` の 4px) を出して、 「Header / Body 境界線」 の見た目を全状態で揃える。
- **Gauge fill の模様**: fill 部分に `.gauge-flow` クラスで **SVG inline pattern の「<<<<」 シェブロン** を repeat-x で重ねる (白 alpha 0.3 / stroke-width 1.2 / 6x4 周期)。 時間の流れを暗示する模様。 アニメーションは入れない (動くと目を奪われる)
- **Body** (padding `10px 16px`): 1 行目に日付テキスト (14px / 500 / dateColor、 1 行 ellipsis)。 visitDate set 時は「`5/1 〜 9/30`」 (イベント期間 = startDate/endDate)、 not set 時は `formatDateLabel(schedule, status)` の dateText。 2 行目以降に notes (13px / subTextColor / 2 行 line-clamp / pre-wrap)。
- **Footer** (padding `0 16px 12px`、 tags があるときのみ): タグ chips (button 化、 タップで絞り込み)。 カード内タグ chip: 背景 `rgba(0, 122, 255, 0.12)` / 文字 `var(--tint)` / 11px / 500 / 2px 8px / 角丸 999。

**past (終了) の文字色トーン**: cancelled は opacity 0.55 + line-through で全体フェードするが、 past は **文字色だけ 1 段薄くする**:
- title: `--label` → `--label-secondary`
- 日付 (14px 主軸): `--label` → `--label-secondary` (`dateColor` 変数)
- notes (13px): `--label-secondary` → `--label-tertiary` (`subTextColor` 変数)
これで「終わったやつ」 が視認的に後ろに下がる + cancelled (フェード + 取り消し線) と past (色味薄め) の差別化ができる。

**カード外に出した情報** (詳細画面でしか見せない):
- StatusDot (左の状態丸印) — 削除。 状態色は gauge + Header 状態色 + 右バッジで訴求
- chevron `›` — 削除。 タップ可能は press-feedback と全体ガラスカードで伝わる
- 期間補足 (`○月○日 〜 ○月○日`) — 単独表示はしない (visitDate set 時は Body の日付テキストがイベント期間そのもの)
- postponedFrom (`○月○日 から延期`) — カードからは出さない、 詳細画面の「日付」 セクション「元の予定」 行で見る

**Why visit pill を Header に統合** (2026-05-24): visit pill を Body 内に置いた初期案は「すっきりしたが目立たない」 と判断、 Body 右上の小バッジも視認性弱。 visit は「いつ行くか」 という主軸情報なので、 通常 badge の場所 (Header 右上) を visit pill で **置き換える** ことで「重要情報が右上」 の iOS 慣習に沿わせた。 結果 visitDate set 時は 1 つの紫 pill が「行く日 + 日付 + あと N 日」 を全部担い、 通常時は緑/黄/灰 状態 badge と意味階層が交代する。

**バッジ共通レシピ** (`.event-badge` クラス):
- 全 badge (visit pill / 通常 badge) に `outline: 1px solid color-mix(in srgb, currentColor 35%, transparent)` + `outline-offset: -1px` を当てて、 内側 1px の枠線を出す (currentColor で badge 色追従)。 outline なので box サイズに影響しない。
- ending-soon / upcoming-soon の「もうすぐ」 系には `.badge-pulse` を重ねる。 これは outline alpha を 55% に強化 + `box-shadow` でネオングロー明滅 (14px blur / 1px spread / currentColor 38% / 2.6s 周期)。 グローは bagde 色 (赤 / 青 / 紫) に追従。 `prefers-reduced-motion` で停止。

**並びとグルーピングの classify は eventStatus (イベント期間 base) を使う** (2026-05-24): 「visitDate set な開催中イベント」 が visit base classify だと upcoming に分類されてリストの下に下がる問題対応。 `classify(schedule, today, { ignoreVisitDate: true })` で startDate / endDate base の eventStatus を別途計算し、 **並び順 / タブ絞り込み (inTab) / counts / Header 状態色 (`cardHeaderBg`) / 終わったイベント分類** はこちらを使う。 一方 **バッジ ラベル (`statusBadge`) / gauge / visit pill の countdown / 文字色** は visit base の status を使う。 「カードの場所と色 = イベント実態」 / 「カード内の数字 = ユーザーの予定」 という二軸分離。

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
  - 左: 閉じる円形ガラスボタン (44x44、 NavBar の `icon: 'close'` と同じ規格、 `X` アイコン 22px、 `var(--label-secondary)`)
  - 右: 確定円形ソリッドボタン (44x44、 NavBar の `icon: 'check'` と同じ規格、 tint ベタ塗り + 白 `Check` 24px、 disabled でグレー)
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

### Toast (`components/Toast.tsx`)

軽量で非ブロッキングなフィードバック。 「やった」 という事後通知 + 任意で取り消しアクション。

**出す / 出さないの線引き**:

- **1 タップで結果が変わるアクション** → Toast + undo を出す (例: 「翌日に延期」 / 「中止する」 / 「再開する」)
- **Sheet / フォームで熟慮して確定するアクション** → Toast 出さない (例: 「日付を指定して延期」 / イベント編集 / イベント新規追加)

理由: Sheet で日付を見て「これ」 と決めた時点で「うっかり」 防止の必要はない。 Toast は気軽に押せる 1 タップ専用の安全網。 iOS Mail でも日付指定スヌーズには Toast を出さないのと同じ慣習。 やみくもに出すとノイズになる。

**Apple HIG には公式の Toast コンポーネントは無い**。 Material 由来の概念なので「黒背景 + 白文字」 風にすると iOS の世界観から浮く。 Apple 自身の 1st-party app (Safari の URL コピー / AirPods 接続カード / 「ホームに追加」 完了) で使われる Liquid Glass のレシピに合わせる。

- 配置: 画面下、 safe-area 上に float (`bottom: calc(env(safe-area-inset-bottom, 0) + 96px)`、 TabBar の上)
- 形: capsule (`border-radius: 999`)、 **横幅は画面いっぱい** (左右 24px padding)。 メッセージ左 / アクション右 (`justify-content: space-between`)、 アクション無しなら中央寄せ
- 背景: AlertDialog と同じガラスレシピ — `rgba(245, 245, 245, 0.72)` + `blur(32px) saturate(180%)` + `0.5px hairline` + `inset 0 1px 0 var(--glass-inner-hi)` + 落ち影 (18-44px)
- 文字: `var(--label)` (黒系)、 15px / 500
- action ボタン (任意): 透明背景 + `var(--tint)` 文字 + 600 weight + capsule padding。 press-feedback 付き
- 動き: 8px 下からスライド + フェードイン (180ms)、 自動消滅前に逆再生
- 表示時間: action 無し = 1400ms、 action 有り = 3000ms (押す時間を確保)
- 連打抑制 + 誤タップ防止: トリガ要素 (例: 詳細画面の「翌日に延期」 行 / 「中止する」 行) は Toast 表示中ずっと `disabled` で opacity 0.4 グレーアウト。 Toast 自体も全幅で背後のタップを覆う配置にしてアクションボタン以外を触りにくくする
- 用途例:
  - EventDetailPage: 「翌日に延期」 タップ後、 「5/24 (日) に延期しました」 + 「取り消す」 アクション

### フィールド編集パターン (EventDetailPage)

詳細画面の各ブロックは **タップで Sheet 編集** に統一する (「右上の編集ボタン」 だけに頼らない、 中止/削除と並ぶアクセス性に揃える):

- ヒーローのタイトル → タイトル編集 sheet (text input)
- 「日付」 ListSection の各 ListRow → 開始日 / 終了日 編集 sheet (date input、 終了日 sheet には「未設定にする」ボタン)
- 「タグ」 ListSection → タグ編集 sheet (TagInput + 候補 chip)。 chip タップ自体は ホーム絞り込み Link、 親 ListRow タップで編集
- 「メモ」 ListSection → メモ編集 sheet (textarea)。 未入力でも ListRow は表示し、 「未入力」 placeholder

実装: ローカル `editing` state で開いてる sheet を特定、 `draftText` / `draftTags` で一時値を保持、 保存で `update()` 呼び出し、 キャンセル / backdrop タップで破棄。 編集画面 (EventEditPage) はホーム新規追加用、 詳細画面では使わない。

**「行く日」 行** (`schedule.visitDate`): 「日付」 ListSection 内、 終了日の下に置く。 未設定: 「+ 行く日を設定」 アフォーダンス。 設定済: date input + 右端の × ボタンでクリア (AlertDialog 確認なし、 即時)。 min は `max(today, startDate)`。 用途は「展覧会等の期間イベントに対して自分 (家族) が行く日 1 件を持つ」。 兄弟が別日に行く稀ケースはタグ + 2 件登録で凌ぐ ([[project-famicale-backlog]] #5 案 A)。

**「時刻」 ListSection** (`schedule.startTime` / `schedule.endTime`): 「日付」 ListSection の **直下** に独立した別ブロックとして配置 (「日付」 と混ぜない、 あくまで **付随データ**)。 行は「開始時刻」 「終了時刻」 の 2 つ、 個別に optional。 未設定時は「+ ○○時刻を追加」 アフォーダンス、 設定済は time input + × クリア (日付行と同じパターン)。 初期値は開始 `10:00` / 終了 `17:00`。 カードの日付ラインに `(10:00〜17:00)` 形式で `--label-tertiary` で後置表示。 片方のみは `(10:00〜)` / `(〜17:00)`。

**visitDate が終了日より後のとき** (`isVisitOutOfRange`): 設定時は AlertDialog で「終了日より後ですが設定しますか?」 と確認、 OK で設定。 設定後はカード全体で警告状態を視覚化:
- カード root の border を `1.5px solid rgba(255, 59, 48, 0.6)` の赤枠に強化
- Header 背景を destructive 系赤 (`rgba(255, 59, 48, 0.08)`)、 Body / Footer 背景も `rgba(255, 59, 48, 0.04)` の薄赤に
- visit pill 自体も紫 → destructive 赤 (`rgba(255, 59, 48, 0.16)` + `var(--destructive)`)、 countdown tail を「あと N 日」 → 「終了後」 に
- gauge accent も `#ff3b30` 赤に
- 詳細ヒーローも accent 赤 + 大数字「終了後」 + subtitle「行く日が終了日を過ぎています」

### 延期 (ズラす) アクション

詳細画面の「日付」 ListSection の下に「ズラす」 ListSection を置く。 **1 行のみ** (Sheet 経由)。 タップで Sheet → date input + 「+1 日 / +1 週間 / +2 週間」 のクイック chip。 確定で `postpone()` を呼ぶ。 Toast は出さない (Sheet 確定型なので [[feedback-toast-usage]] の対象外)。

**ラベル文言の分岐** (主語明示のため、 `schedule.visitDate` の有無で対象を変える):

- `visitDate` set 時: 「**行く日**をズラす」 / Sheet タイトル「行く日をズラす」 (動くのは visitDate のみ)
- `visitDate` not set 時: 「**イベントの日程**をズラす」 / Sheet タイトル「イベントの日程をズラす」 (動くのは startDate + endDate 全体、 期間延長は不可、 delta 移動)

「延期」 → 「ズラす」 に統一: 「延期」 は主語省略時に意味が伝わりにくい。 「ズラす」 + 主語 (行く日 / イベントの日程) で意味が即座に通る。

**1 タップ翌日ショートカットは廃止** (2026-05-24): 初期実装では「翌日にズラす」 行で 1 タップ即実行 + Toast + undo + cooldown を持ってたが、 ユーザー判断で廃止。 ズラす操作は週 1-2 回程度で「ワンタップである必要は無い」 と判断。 Sheet 内 chip 「+1 日」 で 3 タップ済むので最低限の手間で凌げる。 UI もスッキリ。

`postponedFrom` は連打しても初回の値を保持 (`s.postponedFrom ?? s.startDate` パターン)。 visitDate set のときは `s.postponedFrom ?? s.visitDate`。

**visitDate set 時の「イベントの日程をズラす」 別経路**: visitDate set 時はメイン延期 ListSection が「行く日」 を動かす方向に倒れる。 その状態で **イベント自体の期間 (startDate/endDate) が延期された** ケースには対応できないため、 専用の ListSection 「イベントの日程をズラす」 を独立で生やす (visitDate set + active 時のみ、 1 行)。 タップで Sheet → date input + クイック chip。 確定で `shiftEventPeriod()` を呼び、 startDate + endDate を delta で動かす (visitDate は触らない)。 Toast は出さない。

### 情報セクションとアクションセクションの区切り

詳細画面は **情報系 ListSection 群** (タイトル / 日付 / タグ / メモ) と **アクション系 ListSection 群** (ズラす / 行くのをやめる / 中止 / 削除) を、 アクション側の最初の ListSection に **header「予定の編集」** を入れることで視覚的に分ける。 余白だけのスペーサーは入れない (ListSection 間の既定 16px で充分、 header テキスト自体が区切りを担う)。

iOS 設定アプリ風: 情報セクションは内容を示す header (「日付」「タグ」「メモ」)、 アクションセクションは最初に分類 header (「予定の編集」) を入れて以降は header 無しで連続、 という構成。

### 中止 / 削除アクション

詳細画面の最下部に積み上げる ListSection。 「中止」 だけだと **「何を中止するのか」 (= 自分が行くのをやめる / イベント自体が中止される) が曖昧** だったため、 文言と行構成を主語付きにする:

- **「行くのをやめる」** (visitDate set + active 時のみ表示): visitDate を unset するだけ。 status は active のまま、 期間イベントとして残る。 Toast + undo 付き。 1 行独立 ListSection。
- **「イベント自体を中止する」** (visitDate set 時) / **「イベントを中止する」** (visitDate not set 時): status を 'cancelled' に。 Toast + undo 付き。 状態がすでに cancelled なら「このイベントを再開する」 (status を active に戻す、 Toast + undo)
- **「イベントを削除する」**: 物理削除。 AlertDialog 確認後、 schedule をストアから除去 + ホームに navigate

**Why 文言分岐**: 2026-05-23/24 ユーザー実体験で、 「中止する」 を押したら自分の予定変更のつもりが「イベント自体が中止扱い」 になって混乱。 主語省略 = 文脈依存解釈は読まれない ([[feedback-dont-rely-on-microcopy]])。 行を増やす + 主語を入れる方が機能と文言の対応が取れる。

「行くのをやめる」 行は visitDate set 時のみ DOM に存在。 [[feedback-no-layout-shift-on-tap]] と矛盾するように見えるが、 visitDate が無いケースでは「行くのをやめる」 という概念がそもそも存在しないため、 placeholder で寸法確保する意味がなく、 条件レンダで OK。

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
| 通常の戻る / 設定アイコン | **円形ガラスボタン (44x44)** + 半透明白 + blur | NavBar `chevron`, ホームの ⤴ |
| キャンセル (破棄して閉じる) | **円形ガラスボタン (44x44)** + 灰色 ✕ | NavBar `close` |
| 確定アクション (保存/追加) | **円形ソリッドボタン (44x44)** + tint 色 + 白 ✓ + tint シャドウ | NavBar `check` (primary 確定) |
| 通常テキストアクション (献立の「編集」など) | **ピル型ガラスボタン** (高 34、padding 16) + テキスト | NavBar 通常 rightAction |
| プライマリ CTA (画面下の大きい確定) | フル幅 / 2:1 比率の **ピル型ボタン** (radius 999)、tint ベタ塗り + tint シャドウ。 セカンダリは半透明白ガラス + 内側上端ハイライト。 | SharePage の「発行する」、 UploadPage の「AI で読み取る」「○件を追加」「やり直す」 |
| リスト行内のクリア・小操作 | **小さい円形ボタン (24x26)**、灰色 or 赤系 | EventForm の終了日 ✕ |

- **確定アクションの所在**: フロー前進の主アクション (取り込みの「○件を追加」等) は **画面下 CTA**、 フォーム / シート編集の確定 (EventForm 等) は **右上の円形 ✓**。 取り込み (UploadPage) は preview→review で同じ下部位置に文言だけ変えて確定を出し「次に押す場所」 を固定する (右上 ✓ にすると読み取り直後に全選択済み + 既に active で変化が無く、 何をすべきか分からなくなる)
- 円形系は常に半透明白 + blur で「浮き感」、ソリッド系は tint 色 + drop shadow で「目立ち感」
- disabled 時は背景を灰色 (`rgba(120, 120, 128, 0.16)`) + 文字を `--label-tertiary`
- ピル型カプセル (`pillBtn`) と円形 (`circleBtn`) は同じ高さ 44px で揃える (ナビバー内の縦中央が揃う)

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
| NavBar 戻る (chevron) | 26 | 2.5 | `ChevronLeft` |
| NavBar 確定 (check 円形) | 24 | 3 | `Check` |
| NavBar 閉じる (close 円形) | 22 | 2.8 | `X` |
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

## UI 振る舞い原則 (情報設計)

見た目 (色 / 寸法 / 形) と並んでこの原則を満たすこと。 **ユーザーが UI を通じて何を理解し、 どう操作するか** の設計指針。 ファミカレで何を作る / 変えるときも以下に従う。 違反があれば文章で補足する前にまず構造を直す。

### 1. アフォーダンスで意図を伝える、 microcopy には頼らない

実ユーザー (= 開発者でない人) は説明文 / footer / placeholder ヒント / 注意書きを **読まない**。 形・色・配置・アイコンで意図が伝わる UI を最優先で組む。 文字は最後の保険。

- 例: 「終了日 (任意)」 や footer 「複数日のみ入力」 は読まれない → 単日デフォルトで終了日行を隠し、 `+ 終了日を追加` (tint 色 + 専用行) で多日入力アフォーダンスに置換
- 詳細: [[feedback-dont-rely-on-microcopy]]

### 2. 必須は見える、 任意は `+` で展開

フォームでは **必須項目だけ最初に見せる**。 任意項目は `+ ○○を追加` (tint 色 ListRow) で展開可能にする。 「埋めなきゃ」 ストレスを消し、 必要なものだけ追加できる動線にする。

- 開始日: 必須なので最初から表示
- 終了日 / タグ: `+ ○○を追加` 経由で展開
- メモ: 任意でも記入が自然な流れの場所では最初から見せて OK (textarea 1 つ等)
- 既存値ありの編集画面では最初から展開状態にする

### 3. エラーは事後モーダル、 事前 footer ではない

「○○を入力すると押せます」 系の事前ガイダンス footer は使わない。 確定ボタンは常時押せる状態にし、 押された時点でバリデーション失敗なら `AlertDialog` (`hideCancel: true`) で具体的な不足項目を提示する。

- 「イベント名を入力すると追加できます」 footer → 廃止
- 「追加」 ボタンは常時押せる → 押下時に title 空なら「イベント名を入力してください」 モーダル
- disabled state を使うのは「対象データが無い」 等の状況固定型のみ。 入力途中の動的状態には使わない

### 4. 破壊操作は明示的な destructive 行 / ボタン

「空にして保存するとクリアされます」 のような **隠された操作経路** や footer 説明は使わない。 削除 / クリアは destructive 色 + Trash2 アイコンの専用 ListRow / ボタンで一目で見える状態にする。

- 単一値 (タグ chip 削除、 単一マスのクリア) は低リスク → 確認ダイアログなし、 即実行
- 集合 / コンテナ (時間割全体、 タグ registry から削除して cascade) は高リスク → `AlertDialog (destructive)` で確認

### 5. 意図しない動きは抑える、 意図した変化は明示する

両方とも「ユーザーが画面の動きをどう感じるか」 の話。 セットで運用する。

- **意図しない動き**: トグル / 状態切替で要素が増減して画面が跳ねるのは禁止。 placeholder で寸法固定 ([[feedback-no-layout-shift-on-tap]])
- **意図した動き**: 展開 / 折り畳み / 状態変化が現在 viewport の外で起きたら、 軽くスクロール (カード一枚分、 `requestAnimationFrame` 越し) して「反応した」 を見せる ([[feedback-off-viewport-affordance]])

### 6. iOS ネイティブの寸法 / トークンに揃える

タップターゲット 44pt 最小、 角丸 27px 統一 (cf. 角丸の統一ルール)、 同種要素で寸法を内容条件で変えない ([[feedback-uniform-ui-tokens]])。 「コンパクトに見せたい」 等で勝手に縮めない ([[feedback-apple-native-dimensions]])。

### 6 原則の運用

新規 UI を組むとき・既存 UI を変更するときは、 この 6 原則を全部確認してから出す。 「文字で説明したい」 と感じた瞬間に **必ず 1 番に戻る** (構造で語れることが大半)。

---

## ナビゲーション構成

- ボトムタブ 4 つ: `ホーム / 追加 / 撮影 / 時間割`
- アイコンは `lucide-react` を使用 (`House` / `Plus` / `Camera` / `CalendarDays` 等)。 ユニコード文字は使わない
- ナビバーは画面ごとに `NavBar` コンポーネントを使う (ホームのみ NavBar なし、ラージタイトル直置き)
- 戻るボタンは履歴があれば `navigate(-1)` (POP でスクロール位置復元)、 直接 URL アクセス時のみ `back.to` へフォールバック

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
- **新しい円形ボタン・ピルボタンを独自に書かない**。`circleBtn` / `pillBtn` を再利用するか、同等の規格 (44px 高さ・半透明白・blur) で作る。
- **アイコンにユニコード文字や絵文字を直書きしない**。常に `lucide-react` のコンポーネントを使う (バラついた線の太さ・サイズを生まない)。
- **NavBar (sticky) には backdrop-filter blur を入れない**。 iOS 26 Safari で動かない (sticky 親に直接 / absolute child パターン両方試行済み)。 NavBar は素直な半透明白 0.65 + 線なしで固定。 詳細は [[project-famicale-environment]]。 TabBar は `position: absolute` 経由で別ルートでガラス化しているので例外。
- **ブロック間隔を 16px から外さない**。 ListSection を並べたら自動的に 16px。 個別画面で `marginBottom` を上書きして 28 や 40 に戻さない。
- **Sheet モーダルを Portal なしで使わない**。 必ず `createPortal(..., document.body)`。 main の overflow から逃がさないと iOS Safari で位置が壊れる。
- **詳細画面の編集を「右上ボタンだけ」 に閉じない**。 各フィールドの ListRow / ヒーローは直接タップで Sheet 編集できるようにする (中止/削除と同じアクセス性)。
- **破壊的操作の確認に `window.confirm()` / `window.alert()` を使わない**。 必ず `AlertDialog` コンポーネントを使う (OS デフォルトの白いダイアログはガラス感を壊し、 iOS 設定アプリのトーンとも外れる)。
- **Sheet / AlertDialog のヘッダにテキスト「キャンセル」「保存」ボタンを並べない**。 iOS 13-16 風レイアウト。 必ず円形ガラス ✕ + 円形ソリッド ✓ (NavBar の `close` + `check`) に統一する。 タイトルはヘッダ中央ではなく本体の大見出しとして配置する。
- **補助テキスト (footer / placeholder ヒント / 説明書き) で UI の意図を委ねない**。 「複数日にまたがる場合のみ」 「タップで入力」 「○○を入力すると押せます」 等は読まれない。 構造 (アフォーダンス) で語る。 詳細は本ドキュメント「UI 振る舞い原則」 1 番、 および [[feedback-dont-rely-on-microcopy]]。
- **フォームに事前ガイダンス footer を置かない**。 必須項目が未入力でもボタンは押せる状態にし、 押下時のバリデーションで `AlertDialog (hideCancel)` を出す。 詳細は「UI 振る舞い原則」 3 番。
- **破壊操作を footer 文章だけで表現しない**。 削除 / クリアは destructive 色 + Trash2 アイコンの専用 ListRow / ボタンを置く。 「空にして保存するとクリアされます」 のような隠し経路は禁止。 詳細は「UI 振る舞い原則」 4 番。

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
