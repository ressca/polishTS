import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as babelParser from '@babel/parser';
import { describe, it } from 'node:test';
import { transpile } from '../src/index.js';

describe('TypeScript compatibility', () => {
  it('translates common type forms and emits code accepted by TypeScript', () => {
    const source = `
typ Status = "ready" | "waiting";
interfejs Named { readonly name: ciąg; }
typ Identifiers = narzędzie Named;
typ Name = Named["name"];
typ Pair = readonly [id: liczba, aktywna: logiczna];
typ Combined = { id: liczba } & { name: ciąg };
typ Box<T rozszerza object = Named> = { value: T };
typ Constructor = rodzaj Model;

klasa Model implementuj Named {
  publiczny readonly id: liczba;
  publiczny name: ciąg;
  konstruktor(id: liczba, name: ciąg) { this.id = id; this.name = name; }
}

eksportuj funkcja read<T rozszerza klucze Named = "name">(value: Named, key: T): Named[T] {
  zwróć value[key];
}

const status = "ready" as const spełnia Status;
const nullable: ciąg | null = null;
const instance = new Model(1, status);
switch (status) {
  przypadku "ready": break;
  domyślny: break;
}
void nullable;
void instance;
`;
    const output = transpile(source);
    assert.match(output, /type Status = "ready" \| "waiting"/);
    assert.match(output, /keyof Named/);
    assert.match(output, /Named\["name"\]/);
    assert.match(output, /readonly \[id: number, aktywna: boolean\]/);
    assert.match(output, /satisfies Status/);
    assert.match(output, /implements Named/);
    assert.match(output, /switch \(status\)/);

    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-ts-'));
    try {
      const file = path.join(dir, 'compatibility.ts');
      writeFileSync(file, output);
      const compiler = path.resolve('node_modules/typescript/lib/tsc.js');
      const result = spawnSync(process.execPath, [compiler, '--ignoreConfig', '--noEmit', '--strict', '--target', 'ES2022', '--skipLibCheck', file], { encoding: 'utf8' });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows a caller to supply a pinned parser adapter', () => {
    let selectedVersion = '';
    const output = transpile('stała liczbaWynik: liczba przypisz 1;', {
      parser: {
        version: 'caller-pinned',
        parse(code, options) {
          selectedVersion = 'caller-pinned';
          return babelParser.parse(code, options);
        },
      },
    });
    assert.equal(selectedVersion, 'caller-pinned');
    assert.equal(output, 'const liczbaWynik: number = 1;');
  });
});
