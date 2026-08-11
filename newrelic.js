'use strict';

/**
 * New Relic Node.jsエージェント設定
 *
 * Next.js 16はネイティブのOpenTelemetry計装を持つため、
 * 「ハイブリッドエージェント」方式（Node.jsエージェント + OTel）を使う。
 * http/next/undiciの内蔵計装は、Next.js自身のOTel計装と重複するため無効化する。
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
  logging: {
    level: 'info',
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
