import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'polishts-package-smoke-'));
const consumer = path.join(temp, 'consumer');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmEnv = { ...process.env, npm_config_cache: path.join(temp, 'npm-cache') };

try {
  execFileSync(npm, ['pack', '--pack-destination', temp], { cwd: root, env: npmEnv, stdio: 'inherit' });
  const tarball = path.join(temp, readdirSync(temp).find(file => file.endsWith('.tgz')));
  execFileSync(npm, [
    'install', '--prefix', consumer, tarball, '--ignore-scripts', '--no-audit', '--no-fund',
  ], { cwd: root, env: npmEnv, stdio: 'inherit' });

  const bin = path.join(consumer, 'node_modules', '.bin', process.platform === 'win32' ? 'plts.cmd' : 'plts');
  const help = execFileSync(bin, ['--help'], { cwd: consumer, encoding: 'utf8' });
  assert.match(help, /Usage:/);

  const stdinOutput = execFileSync(bin, ['--stdin'], {
    cwd: consumer,
    encoding: 'utf8',
    input: 'stała wynik przypisz 42',
  });
  assert.equal(stdinOutput, 'const wynik = 42;\n');

  const apiSmoke = path.join(consumer, 'api-smoke.mjs');
  writeFileSync(apiSmoke, [
    "import assert from 'node:assert/strict';",
    "import { LANGUAGE_VERSION, transpile } from '@ressca/polishts';",
    "assert.equal(LANGUAGE_VERSION, '0.3');",
    "assert.equal(transpile('stała wynik przypisz 42'), 'const wynik = 42;');",
    "assert.match(transpile('eksportuj funkcja App() { zwróć <div>Cześć</div>; }', { jsx: true }), /<div>Cześć<\\/div>/);",
  ].join('\n'));
  execFileSync(process.execPath, [apiSmoke], { cwd: consumer, stdio: 'inherit' });

  const tsxInput = path.join(consumer, 'App.pltsx');
  writeFileSync(tsxInput, 'eksportuj funkcja App() { zwróć <h1>Cześć</h1>; }');
  execFileSync(bin, [tsxInput], { cwd: consumer, stdio: 'inherit' });
  const tsxOutput = path.join(consumer, 'App.tsx');
  assert.match(readFileSync(tsxOutput, 'utf8'), /export function App\(\).*<h1>Cześć<\/h1>/s);
  console.log('Package smoke tests passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
