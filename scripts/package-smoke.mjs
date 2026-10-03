import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'polishts-package-smoke-'));
const consumer = path.join(temp, 'consumer');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  execFileSync(npm, ['pack', '--pack-destination', temp], { cwd: root, stdio: 'inherit' });
  const tarball = path.join(temp, readdirSync(temp).find(file => file.endsWith('.tgz')));
  execFileSync(npm, [
    'install', '--prefix', consumer, tarball, '--ignore-scripts', '--no-audit', '--no-fund',
  ], { cwd: root, stdio: 'inherit' });

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
    "import { transpile } from 'polishts';",
    "assert.equal(transpile('stała wynik przypisz 42'), 'const wynik = 42;');",
  ].join('\n'));
  execFileSync(process.execPath, [apiSmoke], { cwd: consumer, stdio: 'inherit' });
  console.log('Package smoke tests passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
