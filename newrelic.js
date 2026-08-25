'use strict';

/**
 * New Relic Node.jsエージェント設定
 *
 * opentelemetry.enabled: true はNext.jsの内蔵（ネイティブ）OTel計装を
 * New Relicエージェントが横取りするHybrid Agentモード。この方式ではNext.js
 * 自身がfetch呼び出しをラップしてクライアントスパン・ヘッダー注入を行うため、
 * instrumentation.undiciを有効にすると同じ外部呼び出しに対してNext.js側と
 * undici側で二重にスパンが生成される（実測でも/estimate等の呼び出しで
 * External/...と External/...:<port>/... の重複スパンを確認した）。
 * 公式ドキュメントの推奨構成に合わせ、http/next/undiciはすべて無効化する。
 * https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/nextjs-instrumentation/
 */
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'gameday-workflow-frontend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  opentelemetry: {
    enabled: true,
  },
  instrumentation: {
    http: { enabled: false },
    next: { enabled: false },
    undici: { enabled: false },
  },
  distributed_tracing: {
    // デフォルトのadaptiveサンプリングは1分あたり約10トレースしか完全記録しない
    // （実測でもEstimateTravelCostは10件のトランザクションに対しスパンが4件しか
    // 残っていなかった）。GameDay演習ではタイムアウト調査等で個々のトレースを
    // 追う必要があるため、ルートスパンは常時サンプリングする。
    sampler: {
      root: 'always_on',
    },
  },
  span_events: {
    // adaptiveサンプリングを止めても、1分間の総スパン数がこの上限を超えると
    // 統計的サンプリングされる。上限（10000）まで引き上げて取りこぼしを減らす。
    max_samples_stored: 10000,
  },
  logging: {
    level: 'info',
    // コンテナ内では/appが非rootユーザーの書き込み権限を持たないため、
    // ログファイルへの書き込み（EACCES）を避けてstdoutに出す
    filepath: 'stdout',
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },
};
