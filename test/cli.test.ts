import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';

const cli = path.resolve('dist/cli.js');

function run(args: string[], cwd: string, input?: string) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd, input, encoding: 'utf8',
  });
}

describe('CLI', () => {
  it('prints help successfully', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      const result = run(['--help'], dir);
      assert.equal(result.status, 0);
      assert.match(result.stdout, /Usage:/);
      assert.equal(result.stderr, '');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('reports missing input with a nonzero status', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      const result = run([], dir);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /missing input file/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('reads a file and writes generated output', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      writeFileSync(path.join(dir, 'input.plts'), 'stała wynik przypisz 42');
      const result = run(['input.plts', 'out.ts'], dir);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, /Transpiled:/);
      assert.equal(readFileSync(path.join(dir, 'out.ts'), 'utf8'), 'const wynik = 42;');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('writes only generated code to stdout in stdin mode', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      const result = run(['--stdin'], dir, 'stała wynik przypisz 42');
      assert.equal(result.status, 0);
      assert.equal(result.stdout, 'const wynik = 42;\n');
      assert.equal(result.stderr, '');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('reports malformed input to stderr with location', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      const result = run(['--stdin'], dir, 'stała =');
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /line 1, column/);
      assert.doesNotMatch(result.stderr, /SyntaxError:/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('handles input and output file errors', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-'));
    try {
      const missing = run(['missing.plts'], dir);
      assert.notEqual(missing.status, 0);
      assert.match(missing.stderr, /file not found/);

      writeFileSync(path.join(dir, 'input.plts'), 'stała wynik przypisz 42');
      const writeFailure = run(['input.plts', 'absent/out.ts'], dir);
      assert.notEqual(writeFailure.status, 0);
      assert.match(writeFailure.stderr, /file not found|cannot access/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
