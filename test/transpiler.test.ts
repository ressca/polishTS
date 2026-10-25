import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { transpile, TranspileError } from '../src/index.js';

describe('Polish TypeScript transpiler', () => {
  it('translates Polish declaration keywords and primitive types', () => {
    const code = transpile('stała wynik: liczba przypisz 42');

    assert.equal(code, 'const wynik: number = 42;');
  });

  it('translates control flow and logical operators', () => {
    const code = transpile(
      'jeżeli (prawda i nie fałsz) { stała wynik: liczba = 1; } inaczej { stała wynik: liczba = 0; }',
    );

    assert.match(code, /if \(true && !false\)/);
    assert.match(code, /const wynik: number = 1;/);
    assert.match(code, /else/);
    assert.match(code, /const wynik: number = 0;/);
  });

  it('does not translate Polish words inside strings or comments', () => {
    const code = transpile(
      '// stała pozostaje komentarzem\nconst tekst = "stała prawda";',
    );

    assert.match(code, /\/\/ stała pozostaje komentarzem/);
    assert.match(code, /"stała prawda"/);
    assert.match(code, /const tekst/);
  });

  it('preserves keyword-like names in properties, parameters, and type names', () => {
    const code = transpile(`type prawda = { nie: string; };
function prawdaTest(prawda: boolean, wartosc: prawda) {
  return wartosc.nie;
}`);
    assert.match(code, /type prawda =/);
    assert.match(code, /function prawdaTest\(prawda: boolean/);
    assert.match(code, /wartosc\.nie/);
  });

  it('translates operators while preserving names in objects and imports', () => {
    const code = transpile(`importuj { useState } z "react";
const obiekt = { prawda: 1, nie: 2 };
const wynik = obiekt.prawda i nie fałsz;`);
    assert.match(code, /import \{ useState \} from "react"/);
    assert.match(code, /prawda: 1/);
    assert.match(code, /nie: 2/);
    assert.match(code, /obiekt\.prawda && !false/);
  });

  it('keeps the identifiers i and z while translating them in their operator and module roles', () => {
    const code = transpile(`const i = 1;
const z = "literal";
const sum = i + 2;
const active = prawda i fałsz;
importuj { useState jako stan } z "react";`);
    assert.match(code, /const i = 1/);
    assert.match(code, /const z = "literal"/);
    assert.match(code, /const sum = i \+ 2/);
    assert.match(code, /true && false/);
    assert.match(code, /useState as stan/);
    assert.match(code, /from "react"/);
  });

  it('protects escaped strings, template literals, regexes, and comments', () => {
    const code = transpile('const tekst = "stała \\\" prawda"; // stała\nconst wzorzec = /stała\\/prawda/i;\nconst szablon = `stała ${prawda}`;');
    assert.match(code, /"stała \\\" prawda"/);
    assert.match(code, /\/stała\\\/prawda\/i/);
    assert.ok(code.includes('`stała ${prawda}`'));
    assert.match(code, /\/\/ stała/);
  });

  it('reports parser positions in original Polish source after token expansion', () => {
    assert.throws(() => transpile('stała wartość: liczba = 1;\njeżeli ('), (error: unknown) => {
      assert.ok(error instanceof TranspileError);
      assert.equal(error.location?.line, 2);
      assert.ok((error.location?.column ?? 0) > 0);
      return true;
    });
  });

  it('translates dictionary entries only when the whole identifier matches', () => {
    const code = transpile('const stalaNazwa = 1;');

    assert.match(code, /stalaNazwa/);
    assert.doesNotMatch(code, /constNazwa/);
  });

  it('returns generated code directly', () => {
    assert.equal(transpile('stała aktywna przypisz prawda'), 'const aktywna = true;');
  });

  it('reports malformed source with a structured error and location', () => {
    assert.throws(() => transpile('stała ='), (error: unknown) => {
      assert.ok(error instanceof TranspileError);
      assert.equal(error.kind, 'parse');
      assert.match(error.message, /Unexpected token|Unexpected/i);
      assert.equal(error.location?.line, 1);
      assert.ok((error.location?.column ?? 0) > 0);
      assert.ok(error.cause);
      return true;
    });
  });
});
