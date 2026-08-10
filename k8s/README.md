# Kubernetes マニフェスト

FrontendをKubernetesにデプロイするためのマニフェストです。GitHub ActionsのCI/CD（`.github/workflows/deploy.yml`）は既存のDeploymentへ `kubectl set image` するだけなので、初回のみここでDeployment/Serviceを作成してください。

## ファイル構成

- `namespace.yaml` - `gameday-workflow` 名前空間の定義（他サービスと共有）
- `deployment.yaml` - Deployment（1レプリカ）
- `service.yaml` - ClusterIP Service

## 初回デプロイ手順

```bash
# 名前空間の作成（他サービスで既に作成済みならスキップ可）
kubectl apply -f namespace.yaml

# Deployment / Serviceの作成
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

外部公開する場合は、既存のIngress/Gatewayに合わせて別途設定してください。以降のデプロイはCIの `kubectl set image deployment/gameday-workflow-frontend ...` によって更新されます。
