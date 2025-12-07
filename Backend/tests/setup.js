// backend/tests/setup.js
// Polyfill fetch for Node.js < 18
if (typeof global.fetch === 'undefined') {
  global.fetch = require('cross-fetch');
}