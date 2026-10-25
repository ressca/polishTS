import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { transpile } from '../src/index.js';

// Deterministic PRNG keeps failures reproducible without an extra dependency.
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const alphabet = ['a', 'b', 'x', 'ż', 'ół', '東京', 'данные'];

describe('lexer property and scale checks', () => {
  it('preserves randomly generated Unicode identifiers in declarations and references', () => {
    const next = random(0x504c5453);
    for (let index = 0; index < 250; index++) {
      const identifier = Array.from({ length: 1 + Math.floor(next() * 4) }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
      const source = `stała ${identifier} = ${index};\n${identifier};`;
      const output = transpile(source);
      assert.ok(output.includes(identifier), `identifier ${identifier} should survive`);
    }
  });

  it('translates a large source file without changing user-defined names', () => {
    const declarations = Array.from({ length: 3000 }, (_, index) => `stała wartość${index}: liczba = ${index};`).join('\n');
    const output = transpile(declarations);
    assert.equal((output.match(/const wartość\d+: number = \d+;/g) ?? []).length, 3000);
  });
});
