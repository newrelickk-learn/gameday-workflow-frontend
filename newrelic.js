'use strict';

/**
 * New Relic Node.jsエージェント設定
 *
 * 「Next.js 16のネイティブOTel計装と重複するため」としてhttp/next/undiciの
 * 内蔵計装を無効化していたが、実際にはこのアプリに@opentelemetry/sdk-nodeや
 * @vercel/otel等のOTel SDK/エクスポーターは一切セットアップされておらず
 * （instrumentation.tsはNew Relicエージェントの起動待ちのみ）、重複する
 * 計装は存在しない。その結果、downstream-client.tsが使うグローバルfetch
 * （Node.jsではundici実装）に分散トレーシングヘッダー（newrelic/traceparent）
 * を注入する仕組みがどこにも無く、gameday-workflow-application-approval等の
 * 呼び出し先が同じトレースに正しく連結されない（Entity mapで未計装の外部
 * 呼び出しとして表示される）問題が発生していた。undici計装を有効化し、
 * New Relicエージェント自身にヘッダー注入・トレース連結を行わせる。
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
