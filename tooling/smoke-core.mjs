import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const profile = process.argv.includes('--release') ? 'release' : 'debug';
const executable = resolve(`target/${profile}/reedd${process.platform === 'win32' ? '.exe' : ''}`);
const child = spawn(executable, ['--listen', '127.0.0.1:0'], { stdio: ['ignore', 'pipe', 'pipe'] });
const exit = once(child, 'exit');
let diagnostics = '';
child.stderr.on('data', (chunk) => { diagnostics = (diagnostics + chunk).slice(-16384); });
try {
  const first = await new Promise((resolveLine, reject) => {
    let buffer = '';
    const deadline = setTimeout(() => reject(new Error('Core did not announce a listener within 10 seconds')), 10000);
    const stop = () => clearTimeout(deadline);
    child.once('error', (error) => { stop(); reject(error); });
    child.once('exit', () => { stop(); reject(new Error(`Core exited before listening: ${diagnostics}`)); });
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 16384) { stop(); reject(new Error('Unexpected diagnostic output size')); }
      if (buffer.includes('\n')) { stop(); resolveLine(JSON.parse(buffer.split('\n')[0])); }
    });
  });
  assert.equal(first.event, 'core.listening');
  const address = `http://${first.address}`;
  const response = await fetch(`${address}/health`, { signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.service, 'reed-core');
  assert.equal(health.mode, 'foundation');
  assert.equal(health.protocolVersion, 1);
  assert.deepEqual(health.capabilities, []);
  assert.equal((await fetch(`${address}/tasks`)).status, 404);
  assert.equal((await fetch(`${address}/health`, { method: 'POST' })).status, 405);
  child.kill('SIGTERM');
  const [code] = await Promise.race([exit, delay(5000).then(() => { throw new Error('Core did not exit within 5 seconds'); })]);
  if (process.platform !== 'win32') assert.equal(code, 0);
  console.log(`PASS: standalone ${profile} Core, ephemeral loopback diagnostics, no business endpoints, process exit.`);
  console.log('No Desktop, browser, database or host adapter was required. This is not business-ready or RSC acceptance.');
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}
