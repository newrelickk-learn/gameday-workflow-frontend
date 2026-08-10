# GameDay Workflow Frontend

GameDay Workflow 管理システムのフロントエンドアプリケーションです。

## 技術スタック

- Next.js 14+ (App Router)
- TypeScript
- React 18+
- Tailwind CSS
- GraphQL (graphql-yoga) - BFFとして動作

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
# ローカル環境用
cp .env.local.example .env.local

# 開発環境用
cp .env.development.example .env.development
```

#### GraphQL BFF用の環境変数

GraphQL BFFはダウンストリームサービスに接続するため、以下の環境変数を設定してください：

```bash
# ダウンストリームサービスのURL
USER_SERVICE_URL=http://localhost:8001
APPLICATION_SERVICE_URL=http://localhost:8002
WORKFLOW_SERVICE_URL=http://localhost:8003
AI_SERVICE_URL=http://localhost:8004
```

### 3. 開発サーバーの起動

```bash
# スタブモードで開発（ダウンストリームサービスなし）
NEXT_PUBLIC_USE_STUBS=true npm run dev

# 実際のダウンストリームサービスと接続
# 環境変数を設定してから起動
npm run dev
```

### 4. GraphQL BFFエンドポイント

GraphQL BFFは `/api/graphql` で利用可能です。

#### GraphQLクエリの例

```graphql
# ログイン
mutation {
  login(input: { email: "user@example.com", password: "password" }) {
    token
    user {
      id
      name
      email
      role
    }
  }
}

# 申請一覧取得
query {
  applications {
    id
    title
    description
    status
    applicantName
  }
}

# 申請作成
mutation {
  createApplication(input: {
    type: "business-trip"
    title: "東京出張申請"
    description: "技術カンファレンス参加のため"
    applicantId: "1"
  }) {
    id
    title
    status
  }
}
```

#### GraphQL Playground

GraphQL Yogaは自動的にGraphQL Playgroundを提供します。ブラウザで `/api/graphql` にアクセスすると、インタラクティブなGraphQLクエリエディタが利用できます。

## プロジェクト構成

```
gameday-workflow-frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (dashboard)/       # ダッシュボード関連ページ
│   └── api/               # BFF API Routes
│       └── graphql/      # GraphQLエンドポイント
├── components/            # Reactコンポーネント
│   ├── ui/               # 共通UIコンポーネント
│   ├── forms/            # フォームコンポーネント
│   └── layouts/          # レイアウトコンポーネント
├── lib/                  # ライブラリ・ユーティリティ
│   ├── api/              # APIクライアント
│   │   ├── client.ts     # メインAPIクライアント（GraphQL/スタブ切り替え）
│   │   ├── graphql-client.ts # GraphQLクライアント実装
│   │   ├── stubs/        # スタブ実装
│   │   └── types.ts      # API型定義
│   ├── graphql/          # GraphQL BFF
│   │   ├── schema.ts     # GraphQLスキーマ定義
│   │   ├── resolvers.ts # GraphQLリゾルバー
│   │   ├── downstream-client.ts # ダウンストリームサービス接続クライアント
│   │   └── generated-types.ts   # 型定義
│   ├── graphql/          # GraphQL BFF
│   │   ├── schema.ts     # GraphQLスキーマ定義
│   │   ├── resolvers.ts # GraphQLリゾルバー
│   │   ├── downstream-client.ts # ダウンストリームサービス接続クライアント
│   │   └── generated-types.ts   # 型定義
│   ├── auth/             # 認証関連
│   └── utils/            # ユーティリティ
├── mocks/                # MSW (Mock Service Worker) モック
└── tests/                # テストファイル
```

## アーキテクチャ

### BFF（Backend for Frontend）パターン

このアプリケーションはBFFパターンを採用しています：

1. **フロントエンド** → **Next.js GraphQLエンドポイント** (`/api/graphql`)
2. **Next.js GraphQLエンドポイント** → **ダウンストリームサービス**

**重要**: フロントエンドは直接ダウンストリームサービスに接続しません。すべての通信はNext.jsのGraphQLエンドポイントを通して行われます。

### 通信フロー

```
[フロントエンド] 
    ↓ GraphQL Query/Mutation
[/api/graphql] 
    ↓ HTTP Request
[ダウンストリームサービス]
    - User Service (USER_SERVICE_URL)
    - Application Service (APPLICATION_SERVICE_URL)
    - Workflow Service (WORKFLOW_SERVICE_URL)
    - AI Service (AI_SERVICE_URL)
```

## スタブ実装

開発時にバックエンドAPIが利用できない場合、環境変数 `NEXT_PUBLIC_USE_STUBS=true` を設定することでスタブ実装を使用できます。

スタブ実装は `lib/api/stubs/` ディレクトリに配置されています。

## テストユーザー
1051-1261: 本部長 (director)
16051-20261: 経理 (accounting)
21051-25261: 上長 (manager)
28151-28961: 開発エンジニア (engineer)

以下のメールアドレスでログインすると、それぞれの役割でログインできます：
director@example.com → 本部長（ID: 1051）
accounting@example.com → 経理（ID: 16051）
manager@example.com → 上長（ID: 21051）
engineer@example.com → 開発エンジニア（ID: 28151）

## テスト

```bash
# テストの実行
npm run test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

## ビルド

```bash
npm run build
npm start
```

## リンター・型チェック

```bash
# リンターの実行
npm run lint

# 型チェック
npm run type-check
```

## CI/CD

GitHub Actions を使用してCI/CDパイプラインが設定されています。

- `ci.yml`: プッシュ・プルリクエスト時の自動テスト・ビルド
- `deploy.yml`: mainブランチへのプッシュ時のEKSへの自動デプロイ

## ライセンス

Private

