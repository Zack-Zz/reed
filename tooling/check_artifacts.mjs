import assert from 'node:assert/strict';
const client = await import('@reed/client');
const ui = await import('@reed/ui');
assert.equal(typeof client.getCoreHealth, 'function');
assert.equal(typeof ui.FoundationApp, 'function');
console.log('PASS: independent client/UI build artifacts load as standard ESM.');
