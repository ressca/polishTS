import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { transpile } from '../src/index.js';

const component = `
typ Props<T extends string = string> = { name: T; value: T; };
declare function useState<T>(initial: T): [T, (next: T) => void];
declare function Button(props: { label: string; onClick: () => void }): JSX.Element;
declare function Generic<T extends string = string>(props: { value: T }): JSX.Element;

eksportuj funkcja Greeting<T extends string = string>({ name, value }: Props<T>) {
  const [count, setCount] = useState<number>(0);
  const extra = { title: "preserved" };
  zwróć <>
    <section key={name} data-value={value} {...extra}>
      Cześć, prawda stała! {name} {prawda}
      <Generic<string> value={value} />
      {count > 0 ? <Button label={name} onClick={() => setCount(count + 1)} /> : null}
    </section>
  </>;
}
`;

describe('TSX and React syntax', () => {
  it('translates component code while preserving JSX text, tags, and props', () => {
    const output = transpile(component, { jsx: true });
    assert.match(output, /type Props<T extends string = string>/);
    assert.match(output, /export function Greeting/);
    assert.match(output, /return <>/);
    assert.match(output, /Cześć, prawda stała!/);
    assert.match(output, /<section key=\{name\} data-value=\{value\} \{\.\.\.extra\}>/);
    assert.match(output, /\{true\}/);
    assert.match(output, /<Button label=\{name\} onClick=/);
    assert.match(output, /<Generic<string> value=\{value\} \/>/);
    assert.doesNotMatch(output, /React\.createElement/);
  });

  it('requires explicit TSX mode for JSX in a .plts source', () => {
    assert.throws(() => transpile('eksportuj funkcja App() { zwróć <div />; }'));
    assert.match(transpile('eksportuj funkcja App() { zwróć <div />; }', { jsx: true }), /<div \/>/);
  });

  it('emits TypeScript accepted with react-jsx, react, and preserve modes', () => {
    const output = transpile(component, { jsx: true });
    const dir = mkdtempSync(path.join(tmpdir(), 'polishts-tsx-'));
    try {
      writeFileSync(path.join(dir, 'Component.tsx'), `import * as React from 'react';\n${output}`);
      writeFileSync(path.join(dir, 'jsx.d.ts'), `declare module 'react' {
        export function createElement(type: any, props: any, ...children: any[]): JSX.Element;
      }
      declare module 'react/jsx-runtime' {
        export function jsx(type: any, props: any): JSX.Element;
        export function jsxs(type: any, props: any): JSX.Element;
        export const Fragment: any;
      }
      declare namespace JSX {
        interface Element {}
        interface IntrinsicAttributes { key?: string | number }
        interface IntrinsicElements { [name: string]: any }
      }
`);
      const compiler = path.resolve('node_modules/typescript/lib/tsc.js');
      for (const jsx of ['react-jsx', 'react', 'preserve']) {
        const result = spawnSync(process.execPath, [compiler, '--ignoreConfig', '--noEmit', '--strict', '--target', 'ES2022', '--jsx', jsx, '--skipLibCheck', path.join(dir, 'jsx.d.ts'), path.join(dir, 'Component.tsx')], { encoding: 'utf8' });
        assert.equal(result.status, 0, `${jsx}: ${result.stdout}\n${result.stderr}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
