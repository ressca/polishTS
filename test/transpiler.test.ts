import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from '../src/parser.js';
import { transpile } from '../src/index.js';

describe('Polish TypeScript transpiler', () => {
  it('translates Polish declaration keywords and primitive types', () => {
    const { code } = transpile('stała wynik: liczba przypisz 42');

    assert.equal(code, 'const wynik: number = 42;');
  });

  it('translates control flow and logical operators', () => {
    const { code } = transpile(
      'jeżeli (prawda i nie fałsz) { stała wynik: liczba = 1; } inaczej { stała wynik: liczba = 0; }',
    );

    assert.match(code, /if \(true && !false\)/);
    assert.match(code, /const wynik: number = 1;/);
    assert.match(code, /else/);
    assert.match(code, /const wynik: number = 0;/);
  });

  it('does not translate Polish words inside strings or comments', () => {
    const { code } = transpile(
      '// stała pozostaje komentarzem\nconst tekst = "stała prawda";',
    );

    assert.match(code, /\/\/ stała pozostaje komentarzem/);
    assert.match(code, /"stała prawda"/);
    assert.match(code, /const tekst/);
  });

  it('translates dictionary entries only when the whole identifier matches', () => {
    const { code } = transpile('const stalaNazwa = 1;');

    assert.match(code, /stalaNazwa/);
    assert.doesNotMatch(code, /constNazwa/);
  });

  it('returns both generated code and a Babel Program AST', () => {
    const result = transpile('stała aktywna przypisz prawda');

    assert.equal(result.code, 'const aktywna = true;');
    assert.equal(result.ast.type, 'Program');
    assert.equal(result.ast.body.length, 1);
  });

  it('reports invalid translated TypeScript as a parse error', () => {
    assert.throws(() => parse('stała ='), /Unexpected token|Unexpected/i);
  });
});
