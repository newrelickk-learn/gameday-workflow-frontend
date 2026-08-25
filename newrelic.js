'use strict';

/**
 * New Relic Node.jsエージェント設定
 *
 * opentelemetry.enabled: true はNext.jsの内蔵（ネイティブ）OTel計装を
 * New Relicエージェントが横取りするHybrid Agentモード。公式ドキュメントは
 * このモードでinstrumentation.undiciも無効化する構成を推奨しているが、
 * 実測すると `/api/graphql`（POST、GraphQL経由でtravel/application-approval
 * を呼ぶ入口）を通るリクエストで trace.id が null になり、分散トレーシング
 * 自体が途切れる回帰が発生した（GETの/api/healthは問題なし）。undici計装は
 * 有効化したままにする。この場合、外部呼び出し1回に対してNext.js側と
 * undici側の重複スパン（External/...と External/...:<port>/...）が生成
 * されるが、トレースが完全に切れるより実害が小さいためこちらを優先する。
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
    undici: { enabled: true },
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
