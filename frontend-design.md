# Frontend (Next.js) プロジェクト設計

## リポジトリ名
`gameday-workflow-frontend`

## 技術スタック
- Next.js 14+ (App Router)
- TypeScript
- React 18+
- Tailwind CSS (UI構築用)

## プロジェクト構成

```
gameday-workflow-frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI/CDパイプライン
│       └── deploy.yml             # デプロイワークフロー
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── page.tsx
│   ├── (dashboard)/
│   │   ├── applications/
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   ├── approvals/
│   │   └── page.tsx
│   ├── api/                       # BFF API Routes
│   │   ├── auth/
│   │   ├── applications/
│   │   ├── approvals/
│   │   └── users/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                        # 共通UIコンポーネント
│   ├── forms/                     # フォームコンポーネント
│   └── layouts/                    # レイアウトコンポーネント
├── lib/
│   ├── api/                       # APIクライアント
│   │   ├── client.ts              # メインAPIクライアント
│   │   ├── stubs/                  # スタブ実装
│   │   │   ├── user-service.ts
│   │   │   ├── application-service.ts
│   │   │   ├── workflow-service.ts
│   │   │   └── ai-service.ts
│   │   └── types.ts               # API型定義
│   ├── auth/                      # 認証関連
│   └── utils/                     # ユーティリティ
├── mocks/                         # MSW (Mock Service Worker) モック
│   └── handlers.ts
├── public/
├── tests/
│   ├── __mocks__/
│   ├── components/
│   └── api/
├── .env.local.example
├── .env.development.example
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## スタブ実装の設計

### 環境変数による切り替え

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const USE_STUBS = process.env.NEXT_PUBLIC_USE_STUBS === 'true';

export const apiClient = USE_STUBS 
  ? createStubClient() 
  : createRealClient(API_BASE_URL);
```

### スタブ実装の例

```typescript
// lib/api/stubs/user-service.ts
export const stubUserService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // モックデータを返す
    return {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        name: 'テストユーザー',
        role: 'engineer',
      },
    };
  },
  
  async getUser(id: string): Promise<User> {
    return {
      id,
      name: 'テストユーザー',
      email: 'test@example.com',
      role: 'engineer',
    };
  },
};
```

### MSW (Mock Service Worker) の使用

開発環境でブラウザレベルでAPIをモック：

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        token: 'mock-jwt-token',
        user: { id: '1', name: 'テストユーザー', role: 'engineer' },
      })
    );
  }),
  // ... 他のエンドポイント
];
```

## 単体テスト構成

```typescript
// tests/components/ApplicationForm.test.tsx
import { render, screen } from '@testing-library/react';
import { ApplicationForm } from '@/components/forms/ApplicationForm';

describe('ApplicationForm', () => {
  it('申請フォームが正しく表示される', () => {
    render(<ApplicationForm />);
    expect(screen.getByLabelText('申請タイプ')).toBeInTheDocument();
  });
});
```

## GitHub Actions設定

### CI/CDパイプライン (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_USE_STUBS: 'true'
```

### デプロイワークフロー (.github/workflows/deploy.yml)

```yaml
name: Deploy to EKS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: gameday-workflow-frontend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name gameday-workflow-cluster --region ap-northeast-1
      
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/frontend frontend=${{ steps.build-image.outputs.image }} -n gameday-workflow
          kubectl rollout status deployment/frontend -n gameday-workflow
```

## 開発環境セットアップ

```bash
# 環境変数設定
cp .env.local.example .env.local

# スタブモードで開発
NEXT_PUBLIC_USE_STUBS=true npm run dev

# 実際のAPIと接続
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

