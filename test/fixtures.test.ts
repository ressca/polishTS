import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { transpile } from '../src/index.js';

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'grammar');

describe('grammar fixture corpus', () => {
  for (const file of readdirSync(directory).filter(name => name.endsWith('.plts')).sort()) {
    it(`translates ${file}`, () => {
      const source = readFileSync(path.join(directory, file), 'utf8');
      const expected = readFileSync(path.join(directory, file.replace(/\.plts$/, '.expected.ts')), 'utf8').trim();
      assert.equal(transpile(source).trim(), expected);
    });
  }
});
