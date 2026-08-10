.PHONY: help dev dev-stubs build start lint type-check test install clean

help: ## このヘルプメッセージを表示
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 依存関係をインストール
	npm install

dev: ## 開発サーバーを起動（通常モード）
	npm run dev

dev-stubs: ## 開発サーバーを起動（スタブモード）
	NEXT_PUBLIC_USE_STUBS=true npm run dev

build: ## プロダクションビルド
	npm run build

start: ## プロダクションサーバーを起動
	npm start

lint: ## リンターを実行
	npm run lint

type-check: ## TypeScriptの型チェック
	npm run type-check

test: ## テストを実行
	npm run test

test-watch: ## テストをウォッチモードで実行
	npm run test:watchz

test-coverage: ## テストカバレッジを生成
	npm run test:coverage

clean: ## node_modulesとビルド成果物を削除
	rm -rf node_modules .next out

clean-cache: ## ビルドキャッシュを削除（開発サーバー再起動時に使用）
	rm -rf .next

docker-build: ## Dockerイメージをビルド
	docker-compose build

docker-up: ## Dockerコンテナを起動（実際のサービスに接続）
	docker-compose up frontend

docker-up-stubs: ## Dockerコンテナを起動（スタブモード）
	docker-compose --profile stubs up frontend-stubs

docker-down: ## Dockerコンテナを停止
	docker-compose down

docker-logs: ## Dockerコンテナのログを表示	
	docker-compose logs -f

docker-logs-stubs: ## スタブモードのDockerコンテナのログを表示
	docker-compose --profile stubs logs -f frontend-stubs

.DEFAULT_GOAL := help

