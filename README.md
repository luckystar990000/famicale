# ファミカレ（famicale）

学校プリントを撮影/PDF で取り込むと AI が日付・イベントを抽出し、「あと何日」を家族で見られる Web アプリ。

## 構成

```
work_luckystar/
├── apps/
│   ├── web/    # Cloudflare Pages: React + Vite
│   └── api/    # Cloudflare Workers: Hono + D1 + R2 + Workers AI
└── packages/
    └── shared/ # 型定義 (共通)
```

## 技術スタック

- **フロント**: React 19 + Vite + TypeScript（Cloudflare Pages）
- **API**: Hono on Cloudflare Workers（現状 OCR 取り込みのみで使用）
- **OCR**: Cloudflare Workers AI。画像 = Llama 3.2 11B Vision、PDF = テキスト抽出(unpdf)→Llama 3.1 8B。認証は `wrangler login` の OAuth で済み、個別 API キーは不要
- **ストレージ**: Cloudflare R2（取り込んだ原本）
- **DB**: Cloudflare D1（documents の処理ステータス）
- **永続化**: 予定・時間割・献立・タグ・共有トークンは現状 localStorage。D1 移行は次フェーズ（[[PLAN.md]] 参照）

## 初期セットアップ（初回のみ、ユーザー手動）

```bash
# 1. 依存関係インストール（プロジェクトルートで一度だけ）
npm install

# 2. Cloudflare ログイン（ブラウザ認証）
wrangler login

# 3. D1 データベース（wrangler.toml に database_id 記載済み。実在するか確認）
wrangler d1 list
#   famicale-db が無ければ:  wrangler d1 create famicale-db
#   → 出力された database_id を apps/api/wrangler.toml に反映

# 4. R2 バケット（無ければ作成）
wrangler r2 bucket create famicale-images

# 5. マイグレーション適用
cd apps/api
npm run db:migrate:remote     # 本番 D1
npm run db:migrate:local      # ローカル dev 用（任意）
```

Workers AI は初回呼び出しで自動有効化（無料枠 10,000 Neurons/日）。Anthropic API キーは使わない。

## 開発（ローカル）

ターミナルを 2 つ開いて：

```bash
npm run dev:api    # API (http://localhost:8787)
npm run dev:web    # Web (http://localhost:5173)
```

Vite が `/api/*` を 8787 にプロキシするので、フロントから `/api/...` で叩けます。
OCR は開発中モック切替あり（取り込み画面の DEV トグル、Neurons 節約用）。

## デプロイ

web(Pages) と api(Workers) は別ドメインになる。web はビルド時に API の絶対 URL を
`VITE_API_BASE` で注入する（未設定だと同一オリジン `/api` を叩いて本番で 404）。

```bash
# 1. API を先にデプロイ → 出力される Worker URL を控える
cd apps/api && wrangler deploy
#   例: https://famicale-api.<subdomain>.workers.dev

# 2. Web を API URL 付きでビルドしてデプロイ（URL 末尾に /api を付ける）
cd ../web
VITE_API_BASE=https://famicale-api.<subdomain>.workers.dev/api npm run build
wrangler pages deploy dist --project-name=famicale
```

> ⚠️ 現状 `POST /api/documents` は認証なし・CORS `origin:'*'`。公開すると誰でも
> OCR を叩けて Workers AI の Neurons を消費できる。書き込み API を D1 化して本番運用に
> 載せる段階で CORS 絞り + トークン認証を入れる（詳細は保留メモリ）。

## API エンドポイント

| Method | Path | 説明 |
|---|---|---|
| POST | `/api/documents` | 画像/PDF アップロード（multipart, field=`file`）→ 抽出結果 JSON を同期で返す |
| GET  | `/api/documents` | 取り込み履歴 |
| GET  | `/api/documents/:id` | ドキュメント詳細 |
| GET/POST | `/api/schedules` | スケジュール（※現状フロント未接続、localStorage 運用） |
| GET/PUT/DELETE | `/api/schedules/:id` | スケジュール取得/更新/削除（同上） |

## 次のステップ

- [ ] D1 移行（localStorage → D1、ITP 7 日問題の解消、共有 URL のサーバ化）
- [ ] 書き込み API の CORS 絞り + 認証
- [ ] 通知（前日リマインダ・持ち物）※ D1 移行後に Web Push
