import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../packages/client/src/generated/CoreHealth.ts', import.meta.url);
const mode = process.argv[2];
if (!['--check', '--write'].includes(mode)) throw new Error('Use --check or --write');
const run = spawnSync('cargo', ['run', '--quiet', '--locked', '-p', 'reed-protocol', '--features', 'type-export', '--example', 'export_types'], {
  cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024,
});
if (run.status !== 0) { process.stderr.write(run.stderr ?? 'Contract generator failed'); process.exit(1); }
if (mode === '--write') writeFileSync(output, run.stdout);
else if (readFileSync(output, 'utf8') !== run.stdout) throw new Error('Generated contracts are stale. Run npm run generate:contracts.');
console.log(mode === '--write' ? 'Generated Rust-owned wire types.' : 'Rust/TypeScript generated contract matches.');
