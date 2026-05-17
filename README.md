# ファミカレ（famicale）

学校プリントを撮影するだけで、AI が日付・イベントを抽出し、家族で共有できる Web アプリ。

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

- **フロント**: React 19 + Vite + TypeScript（Cloudflare Pages にデプロイ）
- **API**: Hono on Cloudflare Workers
- **DB**: Cloudflare D1（SQLite）
- **ストレージ**: Cloudflare R2（プリント画像）
- **OCR**: Claude API（Vision）で日本語プリントから日付・イベントを抽出
- **Auth**: 家族 ID + 招待コードのシンプル方式（MVP）

## 初期セットアップ

```bash
# 1. 依存関係インストール（プロジェクトルートで一度だけ）
npm install

# 2. Cloudflare ログイン
wrangler login

# 3. D1 データベース作成
cd apps/api
wrangler d1 create famicale-db
# → 出力された database_id を wrangler.toml の REPLACE_WITH_YOUR_D1_DATABASE_ID に貼り付け

# 4. R2 バケット作成
wrangler r2 bucket create famicale-images

# 5. マイグレーション適用（ローカルとリモート）
npm run db:migrate:local
npm run db:migrate:remote

# 6. Claude API キーを Workers シークレットに登録
wrangler secret put ANTHROPIC_API_KEY
# 値を貼り付けて Enter
```

## 開発（ローカル）

ターミナルを 2 つ開いて：

```bash
# ターミナル 1: API (http://localhost:8787)
npm run dev:api

# ターミナル 2: Web (http://localhost:5173)
npm run dev:web
```

Vite は `/api/*` を 8787 にプロキシするので、フロントから `/api/...` で叩けます。

## デプロイ

```bash
# API
cd apps/api && wrangler deploy

# Web (初回のみプロジェクト作成)
cd apps/web && npm run build
wrangler pages deploy dist --project-name=famicale
```

## API エンドポイント

すべて `X-Family-Id` ヘッダ必須（`/families` 以外）。

| Method | Path | 説明 |
|---|---|---|
| POST | `/api/families` | 家族を作成。`{ name }` |
| POST | `/api/families/join` | 招待コードで家族に参加。`{ inviteCode }` |
| POST | `/api/documents` | 画像アップロード（multipart, field=`image`） |
| GET  | `/api/documents` | アップロード履歴 |
| GET  | `/api/documents/:id` | ドキュメント詳細 |
| GET  | `/api/schedules` | スケジュール一覧。`?month=YYYY-MM` で絞り込み |
| PUT  | `/api/schedules/:id` | スケジュール更新（確認・編集） |
| DELETE | `/api/schedules/:id` | スケジュール削除 |

## 次のステップ

- [ ] テンプレート学習（学校ごとのフォーマット蓄積）
- [ ] ルールベース抽出（正規表現で AI 呼び出しを減らしてコスト削減）
- [ ] 通知（前日リマインダ・持ち物）
- [ ] 担当者紐付け（子供ごと）
- [ ] Google カレンダー連携
