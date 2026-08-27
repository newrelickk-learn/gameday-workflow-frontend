const originalResolve = require.resolve;
const path = require('path');

if (process.env.NEXT_SKIP_SWC_LOADER !== '1') {
  require.resolve = function(id, options) {
    if (id === '@jest/test-sequencer') {
      return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
    }
    return originalResolve.apply(this, arguments);
  };
} else {
  require.resolve = function(id, options) {
    if (id === '@jest/test-sequencer') {
      return path.join(__dirname, 'node_modules/@jest/test-sequencer/build/index.js');
    }
    return originalResolve.apply(this, arguments);
  };
}
