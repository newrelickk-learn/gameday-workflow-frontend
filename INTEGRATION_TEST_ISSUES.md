# 統合テスト問題調査レポート

## 調査日
2024年（調査実施日）

## 調査内容
gameday-workflow-frontendディレクトリでの統合テストの問題を調査しました。

## 発見された問題点と修正内容

### 1. ヘルスチェックエンドポイントの未実装 ✅ 修正済み

**問題:**
- `docker-compose.yml`のヘルスチェック設定で `/api/health` エンドポイントを参照していたが、実際には実装されていなかった
- ヘルスチェックが `/` をチェックしていたが、他のサービス（user, application-approval, workflow-notification）は `/health` を使用している

**修正内容:**
- `/app/api/health/route.ts` を新規作成し、ヘルスチェックエンドポイントを実装
- `docker-compose.yml`のヘルスチェック設定を `/api/health` に変更

**修正ファイル:**
- `app/api/health/route.ts` (新規作成)
- `docker-compose.yml` (ヘルスチェック設定を修正)

### 2. サービス間接続設定の確認 ✅ 問題なし

**確認結果:**
- **User Service**: `http://gameday_workflow_user_api:80` ✓
  - userサービスの`container_name: gameday_workflow_user_api`と一致
  
- **Application Service**: `http://gameday-workflow-application-approval-service:8002` ✓
  - application-approvalサービスの`container_name: gameday-workflow-application-approval-service`と一致
  
- **Workflow Service**: `http://workflow-notification-service:8003` ✓
  - workflow-notificationサービスのサービス名`workflow-notification-service`と一致
  - 注意: workflow-notificationサービスのdocker-compose.ymlには`container_name`が定義されていないが、サービス名がそのまま使用されるため問題なし

### 3. GraphQL BFFエンドポイント ✅ 問題なし

**確認結果:**
- GraphQL BFFエンドポイント `/api/graphql` は正しく実装されている
- `app/api/graphql/route.ts` でGraphQL Yogaを使用して実装
- リゾルバーは `lib/graphql/resolvers.ts` で実装
- ダウンストリームクライアントは `lib/graphql/downstream-client.ts` で実装

### 4. 環境変数の設定確認 ✅ 問題なし

**確認結果:**
- `USE_DOWNSTREAM_STUBS` 環境変数でスタブモードを制御
- デフォルトは `false`（実際のサービスに接続）
- 各サービスのURLは環境変数で設定可能

## 推奨事項

### 1. workflow-notification-serviceのコンテナ名を明示的に定義

workflow-notification-serviceの`docker-compose.yml`に`container_name`を追加することを推奨します：

```yaml
workflow-notification-service:
  container_name: workflow-notification-service
  # ... その他の設定
```

これにより、コンテナ名が明確になり、接続設定の一貫性が保たれます。

### 2. 統合テストの実行方法

統合テストを実行する際は、以下の手順を推奨します：

1. すべてのサービス（db, user, application-approval, workflow-notification）を起動
2. 各サービスのヘルスチェックが成功することを確認
3. frontendサービスを起動
4. frontendのヘルスチェックが成功することを確認
5. GraphQL BFFエンドポイント `/api/graphql` にアクセスして動作確認

### 3. ログの確認方法

問題が発生した場合は、以下のコマンドでログを確認：

```bash
# frontendサービスのログ
docker-compose logs -f frontend

# すべてのサービスのログ
docker-compose logs -f

# 特定のサービスのログ（例: user service）
docker logs gameday_workflow_user_api
```

### 4. ネットワーク接続の確認

すべてのサービスが同じDockerネットワーク（`gameday-workflow-network`）に接続されていることを確認：

```bash
docker network inspect gameday-workflow-network
```

## 修正済みファイル

1. `app/api/health/route.ts` - ヘルスチェックエンドポイントの実装
2. `docker-compose.yml` - ヘルスチェック設定の修正

## 次のステップ

1. 修正内容をテスト環境で検証
2. 統合テストを実行して動作確認
3. 問題が解決しない場合は、ログを確認して追加の問題を特定

