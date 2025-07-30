# Digital Signage Application

Google Calendarのイベントを1920×1280ディスプレイに表示するためのデジタルサイネージWebアプリケーション。

## 機能

- Google Calendar連携によるイベント表示
- 複数カレンダーの統合表示
- 10分ごとの自動更新
- 管理画面でのカレンダー設定
- 1920×1280解像度に最適化された表示

## 技術スタック

- **バックエンド**: Node.js + Express + TypeScript
- **フロントエンド**: Vue 3 + TypeScript + Vite
- **認証**: Google OAuth 2.0
- **デプロイ**: Docker (QNAP対応)

## QNAPへのセットアップ

### 前提条件

- QNAP Container Station がインストールされていること
- プライベートコンテナレジストリへのアクセス（[Docker Registry](https://hub.docker.com/_/registry)参照）
- Google Cloud ConsoleでOAuth 2.0クライアントIDを作成済みであること

### 1. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
4. アプリケーションの種類: 「ウェブアプリケーション」
5. 承認済みのリダイレクトURI: `http://[QNAP-IP]:3124/auth/callback`
6. クライアントIDとクライアントシークレットをメモ

### 2. Dockerイメージのビルドとプッシュ

ローカル環境でDockerイメージをビルドし、プライベートレジストリにプッシュします：

```bash
# リポジトリをクローン
git clone https://github.com/[your-repo]/signage-app.git
cd signage-app

# Dockerイメージをビルド
docker build -t [registry-url]/signage-app:latest .

# プライベートレジストリにプッシュ
docker push [registry-url]/signage-app:latest
```

### 3. QNAPでのデプロイ

1. QNAP Container Stationを開く
2. 「作成」→「Docker Compose YAMLを使用してアプリケーションを作成」を選択
3. `docker-compose.qnap.yml`の内容をコピーして貼り付け、環境変数を適切に設定：

```yaml
services:
  signage-app:
    image: [registry-url]/signage-app:latest
    container_name: signage-app
    pull_policy: always
    ports:
      - "3124:3124"
    environment:
      # Google OAuth設定
      - GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
      - GOOGLE_CLIENT_SECRET=your-client-secret
      - GOOGLE_REDIRECT_URI=http://[QNAP-IP]:3124/auth/callback
      # サーバー設定
      - PORT=3124
      - NODE_ENV=production
      - DATA_DIR=/app/data
      # 管理画面設定
      - ADMIN_PASSWORD=your-secure-password
      # ログ設定
      - LOG_LEVEL=info
    volumes:
      # QNAPの共有フォルダパスを指定（適宜変更してください）
      - /share/Container/signage-app/data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3124/api/status', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

4. 「作成」をクリックしてアプリケーションを起動

### 4. 初期設定

1. ブラウザで `http://[QNAP-IP]:3124` にアクセス
2. 初回アクセス時は自動的に `/setup` にリダイレクト
3. 「Googleアカウントでログイン」をクリック
4. Googleアカウントを選択し、カレンダーへのアクセスを許可
5. 認証完了後、`/admin` で管理画面にアクセス（パスワード必要）
6. 表示したいカレンダーを選択・設定

## 開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm または yarn

### 開発手順

1. リポジトリのクローン:
```bash
git clone https://github.com/[your-repo]/signage-app.git
cd signage-app
```

2. 依存関係のインストール:
```bash
npm run install:all
```

3. 環境変数の設定:
```bash
cp .env.example .env
# .envファイルを編集し、OAuth認証情報を設定
# 開発環境では GOOGLE_REDIRECT_URI を http://localhost:3124/auth/callback に設定
```

> **注意**: 開発環境では`.env`を使用します。Docker環境では`.env.docker`を使用してください。

4. 開発サーバーの起動:
```bash
npm run dev
```
- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3124

### 開発コマンド

```bash
# 開発サーバー（フロントエンド + バックエンド）
npm run dev

# サーバーのみ
npm run server:dev

# クライアントのみ
npm run client:dev

# TypeScriptの型チェック
npm run typecheck  # サーバーとクライアント両方の型チェック

# プロダクションビルド
npm run build

# プロダクションビルドのプレビュー
cd client && npm run preview
```

## ディレクトリ構成

```
.
├── client/          # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/    # Vueコンポーネント
│   │   ├── composables/   # Vue Composition API
│   │   └── router/        # Vue Router設定
│   └── dist/             # ビルド出力
├── server/          # バックエンドサーバー
│   ├── src/
│   │   ├── auth/         # OAuth認証
│   │   ├── calendar/     # Google Calendar API
│   │   └── routes/       # APIエンドポイント
│   └── dist/            # ビルド出力
├── app-data/        # 永続化データ
│   ├── tokens/          # OAuth トークン
│   └── calendars.json   # カレンダー設定
└── docker-compose.yml   # Docker設定
```

## 使用方法

### 表示画面 (`/`)

- 1920×1280解像度に最適化されたカレンダー表示
- 10分ごとに自動更新
- 当日の日付がハイライト表示

### 管理画面 (`/admin`)

- パスワード認証が必要（環境変数 `ADMIN_PASSWORD`）
- カレンダーの追加・削除・色設定
- 表示設定（週の開始日、言語、タイムゾーン）

### APIエンドポイント

- `GET /api/calendar` - カレンダーイベントの取得
- `GET /api/calendars` - 利用可能なカレンダー一覧
- `GET/POST /api/config` - カレンダー設定の取得・更新
- `GET /auth/status` - 認証状態の確認

## トラブルシューティング

### 認証エラーが発生する場合

1. 環境変数ファイルの設定を確認（開発環境: `.env`、Docker環境: `.env.docker`）
2. Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
3. `app-data/tokens/`ディレクトリの権限を確認

### カレンダーが表示されない場合

1. Google Calendarへのアクセス権限を確認
2. 管理画面でカレンダーが選択されているか確認
3. ブラウザのコンソールでエラーを確認

### Dockerコンテナが起動しない場合

1. ポート3124が他のアプリケーションで使用されていないか確認
2. Container Stationでコンテナのログを確認
3. docker-compose.yml内の環境変数が正しく設定されているか確認
4. ボリュームパス（`/share/Container/signage-app/data`）が存在し、書き込み権限があるか確認

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容について議論してください。