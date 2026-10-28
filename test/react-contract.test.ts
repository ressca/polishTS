import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { transpile } from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('React starter contract', () => {
  it('translates the starter source while preserving React and JSX semantics', () => {
    const source = readFileSync(path.join(root, 'examples/react-vite/src/App.pltsx'), 'utf8');
    const output = transpile(source, { jsx: true }).trim();
    assert.match(output, /<h1>Cześć, \{imię\}!<\/h1>/);
    assert.match(output, /Polskie słowa w treści, takie jak prawda i stała/);
    assert.match(output, /useState<number>/);
    assert.doesNotMatch(output, /React\.createElement/);
  });
});
