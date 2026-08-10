// Next.jsのrequire-hookを回避するため、require.resolveをオーバーライド
// jest.config.jsが読み込まれる前に実行される必要がある
const originalResolve = require.resolve;
const path = require('path');

// Next.jsのrequire-hookを無効化
if (process.env.NEXT_SKIP_SWC_LOADER !== '1') {
  // Next.jsのrequire-hookが読み込まれる前に、require.resolveをオーバーライド
  require.resolve = function(id, options) {
    if (id === '@jest/test-sequencer') {
      return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
    }
    return originalResolve.apply(this, arguments);
  };
} else {
  // NEXT_SKIP_SWC_LOADERが設定されている場合でも、require.resolveをオーバーライド
  require.resolve = function(id, options) {
    if (id === '@jest/test-sequencer') {
      return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
    }
    return originalResolve.apply(this, arguments);
  };
}
