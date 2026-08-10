// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Next.jsのrequire-hookを回避するため、require.resolveをオーバーライド
const originalResolve = require.resolve;
const path = require('path');
require.resolve = function(id, options) {
  if (id === '@jest/test-sequencer') {
    return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
  }
  return originalResolve.apply(this, arguments);
};

// Jest環境でTextDecoderとTextEncoderを設定（undiciが必要とする）
if (typeof globalThis.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  globalThis.TextDecoder = TextDecoder;
  globalThis.TextEncoder = TextEncoder;
}

// Jest環境でReadableStreamを設定（undiciが必要とする）
if (typeof globalThis.ReadableStream === 'undefined') {
  try {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
  } catch (e) {
    // stream/webが利用できない場合、空の実装を提供
    console.warn('ReadableStream not available, undici may not work correctly');
  }
}

// Jest環境でfetchをグローバルに設定（Node.js 18以降では利用可能）
// Jest環境では、node-fetchを使用するのが最も確実
if (typeof globalThis.fetch === 'undefined') {
  try {
    // node-fetchを使用（Jest環境で最も確実に動作）
    const fetch = require('node-fetch');
    globalThis.fetch = fetch;
    console.log('[Jest Setup] fetch set from node-fetch');
  } catch (e) {
    // node-fetchが利用できない場合、Node.js 18以降のグローバルfetchを使用
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    
    if (majorVersion >= 18) {
      // Node.js 18以降では、fetchがグローバルに利用可能
      // Jest環境では、globalThisに設定する必要がある
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

// Jest環境でlocalStorageのモック
if (typeof globalThis.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  globalThis.localStorage = localStorageMock;
}

// テスト環境でNEXT_PUBLIC_USE_STUBSを設定
// デフォルトはtrue（スタブモード）だが、環境変数でfalseに設定すると実際のサーバーに接続
if (process.env.NEXT_PUBLIC_USE_STUBS === undefined) {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
}

// 実際のサーバーに接続する場合は、GraphQL URLを設定
if (process.env.NEXT_PUBLIC_USE_STUBS === 'false' && !process.env.NEXT_PUBLIC_GRAPHQL_URL) {
  process.env.NEXT_PUBLIC_GRAPHQL_URL = 'http://localhost:3000/api/graphql';
}

