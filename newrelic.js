'use strict';

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
    sampler: {
      root: 'always_on',
    },
  },
  span_events: {
    max_samples_stored: 10000,
  },
  rules: {
    ignore: ['^/api/health$'],
  },
  logging: {
    level: 'info',
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
