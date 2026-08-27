import '@testing-library/jest-dom'

const originalResolve = require.resolve;
const path = require('path');
require.resolve = function(id, options) {
  if (id === '@jest/test-sequencer') {
    return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
  }
  return originalResolve.apply(this, arguments);
};

if (typeof globalThis.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  globalThis.TextDecoder = TextDecoder;
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
  } catch (e) {
    console.warn('ReadableStream not available, undici may not work correctly');
  }
}

if (typeof globalThis.fetch === 'undefined') {
  try {
    const fetch = require('node-fetch');
    globalThis.fetch = fetch;
    console.log('[Jest Setup] fetch set from node-fetch');
  } catch (e) {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    
    if (majorVersion >= 18) {
      if (typeof global.fetch === 'function') {
        globalThis.fetch = global.fetch;
        if (typeof global.Headers === 'function') {
          globalThis.Headers = global.Headers;
        }
        if (typeof global.Request === 'function') {
          globalThis.Request = global.Request;
        }
        if (typeof global.Response === 'function') {
          globalThis.Response = global.Response;
        }
        console.log('[Jest Setup] fetch set from Node.js global');
      } else {
        console.warn('[Jest Setup] fetch not available. Please install node-fetch');
      }
    } else {
      console.warn('[Jest Setup] fetch not available. Please install node-fetch or use Node.js 18+');
    }
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  globalThis.localStorage = localStorageMock;
}

if (process.env.NEXT_PUBLIC_USE_STUBS === undefined) {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
}

if (process.env.NEXT_PUBLIC_USE_STUBS === 'false' && !process.env.NEXT_PUBLIC_GRAPHQL_URL) {
  process.env.NEXT_PUBLIC_GRAPHQL_URL = 'http://localhost:3000/api/graphql';
}

