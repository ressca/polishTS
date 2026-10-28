# PolishTS

**PolishTS** is a source-to-source translator for a Polish-keyword subset of TypeScript. It reads `.plts` files and emits `.ts` files. In TSX mode it reads `.pltsx` and emits `.tsx`. It does not emit JavaScript, type-check programs, or replace `tsc`, React, or a bundler.

The current language contract is **0.3** (`LANGUAGE_SPEC.md`; Polish translation: [`LANGUAGE_SPEC.pl.md`](LANGUAGE_SPEC.pl.md)). This release uses a custom Unicode-aware lexer and context-sensitive token translator, Babel's TypeScript parser, and Babel's code generator. Parser errors are mapped back to positions in the original source. The translator is not a full Polish grammar or a TypeScript AST-to-AST translator; see the documented limitations before adopting it for a large codebase.

- Polish documentation: [`README.pl.md`](README.pl.md)
- Language and dictionary contract: [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md)
- Release notes: [`CHANGELOG.md`](CHANGELOG.md)
- Release procedure: [`docs/RELEASING.md`](docs/RELEASING.md)

## Requirements

- Node.js `>=18` for the `polishts` package and CLI.
- The React/Vite starter uses Vite 8 and therefore needs Node.js 20.19+ or 22.12+.
- The parser accepts the TypeScript syntax supported by the resolved `@babel/parser` version. Babel parser compatibility is not the same as TypeScript compiler compatibility; use `tsc` to type-check generated files.

## Install and use the CLI

```sh
npm install polishts

plts src/program.plts                 # writes ./program.ts
plts src/program.plts --out out.ts    # writes the selected output path
plts src/program.plts --print         # writes TypeScript to stdout
cat src/program.plts | plts --stdin   # reads source from stdin
plts --project                        # translates every configured project source
plts --help
```

The default output is written to the current working directory, using the input basename. `.pltsx` automatically enables JSX parsing and selects a `.tsx` output. Use `--tsx` to enable the same mode for another input filename:

```sh
plts src/App.pltsx                     # writes ./App.tsx
plts src/App.plts --tsx --out App.tsx
```

`--stdin` and `--print` write generated code to stdout. File mode reports the output path. Errors are written to stderr and return a non-zero exit status.

### Translate a project

Run `plts --project` from the project root to discover every `.plts` and `.pltsx` file under the configured input paths. By default, PolishTS scans `src/` and writes a mirrored project tree to `pltsxGenerated/`. Polish sources become `.ts`/`.tsx`; other files in the input tree, such as ordinary TypeScript, CSS, and images, are copied so relative imports continue to resolve. If a `.plts`/`.pltsx` source and a same-output-path `.ts`/`.tsx` file coexist, the Polish source generates that output path.

Create `polishts.config.json` to change the input paths or output directory:

```json
{
  "include": ["src"],
  "exclude": ["src/fixtures"],
  "outDir": "pltsxGenerated"
}
```

`include` and `exclude` are paths relative to the project root; directories are scanned recursively. The output directory is replaced on each run only if it was created and marked by PolishTS. Add the configured output directory to `.gitignore`. The React/Vite starter demonstrates this flow: its `translate` script runs `plts --project`, and Vite/TypeScript consume `pltsxGenerated/`.

### React and Vite setup

Keep Polish sources and assets in `src/`. Vite should load the generated entry point, and project scripts should translate before starting Vite or TypeScript:

The relevant part of `package.json` is:

```json
{
  "scripts": {
    "translate": "plts --project",
    "dev": "npm run translate && vite",
    "typecheck": "npm run translate && tsc --noEmit",
    "build": "npm run translate && tsc --noEmit && vite build"
  }
}
```

The project configuration scans all of `src/`; adding another `.pltsx` file does not require editing the command:

`polishts.config.json`:

```json
{
  "include": ["src"],
  "outDir": "pltsxGenerated"
}
```

Point Vite's HTML entry at the mirrored output tree:

Add this entry to `index.html`:

```html
<script type="module" src="/pltsxGenerated/src/main.tsx"></script>
```

For a React Vite project using the `@/` import alias, point both Vite and TypeScript at the generated `src/` tree:

`vite.config.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(projectRoot, './pltsxGenerated/src') },
  },
});
```

Add the alias and generated directory to `tsconfig.app.json` (or `tsconfig.json`):

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./pltsxGenerated/src/*"] }
  },
  "include": ["pltsxGenerated/src", "vite.config.ts"]
}
```

Finally, keep generated output out of version control:

```gitignore
/pltsxGenerated/
```

The starter in [`examples/react-vite/`](examples/react-vite/) contains a complete working version of this setup.

## Use the library

```ts
import { transpile, TranspileError, LANGUAGE_VERSION } from 'polishts';

console.log(LANGUAGE_VERSION); // "0.3"
const output = transpile('stała wynik: liczba przypisz 42');
// const wynik: number = 42;

const tsx = transpile(
  'eksportuj funkcja App() { zwróć <h1>Cześć</h1>; }',
  { jsx: true },
);

try {
  transpile('stała =');
} catch (error) {
  if (error instanceof TranspileError) {
    console.error(error.kind, error.location, error.message);
  }
}
```

`transpile(source, options?)` returns a string. Options currently are:

- `jsx?: boolean` — enable JSX parsing; it is `false` by default.
- `parser?: ParserAdapter` — provide a compatible parser with a `version` label and a `parse` function. The label is informational; PolishTS does not verify that the parser matches a particular TypeScript release.

`TranspileError.kind` is `parse` or `transform`. `location`, when available, uses one-based line and column coordinates in the original source. Babel's AST is an implementation detail and is not returned.

## Dictionary at a glance

The table lists every entry currently present in the implementation dictionary. An entry is a candidate translation, not an unconditional textual replacement: the lexer and translator apply contextual rules to selected categories. In particular, the single-letter conjunction `i` and the module word `z` have special heuristics. Names in declaration, property, parameter, import-alias, and JSX positions are intended to remain unchanged; the implementation is heuristic, so check [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md) for known boundaries.

| Polish spelling | TypeScript spelling | Notes |
| --- | --- | --- |
| `stała` | `const` | Variable declaration |
| `zmienna` | `let` | Variable declaration |
| `var` | `var` | Accepted unchanged |
| `liczba` | `number` | Primitive type position |
| `ciąg`, `łańcuch` | `string` | Primitive type position |
| `logiczna` | `boolean` | Primitive type position |
| `dowolny` | `any` | Primitive type position |
| `nieznany` | `unknown` | Primitive type position |
| `nic` | `void` | Primitive type position |
| `nigdy` | `never` | Primitive type position |
| `obiekt` | `object` | Primitive type position |
| `symbol` | `symbol` | Accepted unchanged |
| `duża_liczba` | `bigint` | Primitive type position |
| `prawda`, `fałsz` | `true`, `false` | Boolean literal position |
| `nieokreślony` | `undefined` | Value position |
| `i`, `lub`, `nie` | `&&`, `||`, `!` | Logical operator/value positions; `i` is heuristic |
| `równa`, `różne` | `===`, `!==` | Comparison operator positions |
| `mniejsze`, `większe` | `<`, `>` | Comparison operator positions |
| `mniejsze_równe`, `większe_równe` | `<=`, `>=` | Comparison operator positions |
| `przypisz` | `=` | Assignment |
| `plus_równa`, `minus_równa`, `razy_równa` | `+=`, `-=`, `*=` | Compound assignment |
| `podziel_równo`, `modulo_równa` | `/=`, `%=` | Compound assignment |
| `pytajnik_kropka`, `podwójne_pytajnik` | `?.`, `??` | Optional chaining and nullish coalescing |
| `jeżeli`, `inaczej` | `if`, `else` | Conditional statements |
| `dla`, `dopóki`, `zrób` | `for`, `while`, `do` | Loops |
| `przerwij`, `kontynuuj`, `zwróć` | `break`, `continue`, `return` | Control flow |
| `przypadku`, `domyślny` | `case`, `default` | `domyślny` is recognized in a `default:`-like position |
| `funkcja`, `asynchroniczna`, `oczekuj` | `function`, `async`, `await` | Function syntax |
| `klasa`, `rozszerza`, `implementuj` | `class`, `extends`, `implements` | Class syntax |
| `konstruktor` | `constructor` | Class member |
| `modyfikator`, `tylko_czytelny` | `readonly` | Modifier |
| `publiczny`, `publiczne` | `public` | Modifier |
| `prywatny`, `prywatne` | `private` | Modifier |
| `chroniony`, `chronione` | `protected` | Modifier |
| `statyczny`, `abstrakcyjna` | `static`, `abstract` | Class modifiers |
| `ten`, `rodzaj`, `instancja` | `this`, `typeof`, `instanceof` | Candidate token translations |
| `interfejs`, `typ` | `interface`, `type` | Declarations |
| `enumeracja`, `wyliczenie` | `enum` | Two aliases |
| `importuj`, `eksportuj` | `import`, `export` | Module declarations |
| `domyślny_eksport` | `export default` | Default export declaration |
| `jako` | `as` | Alias/type assertion positions |
| `z` | `from` | Recognized heuristically in import/export module clauses |
| `narzędzie`, `klucze` | `keyof` | Type operator positions |
| `spełnia` | `satisfies` | TypeScript `satisfies` operator |
| `spróbuj`, `złap`, `na_koniec`, `rzuć` | `try`, `catch`, `finally`, `throw` | Exception handling |

Standard TypeScript forms such as `new`, `null`, `switch`, `as`, `implements`, `from`, `extends`, and `=>` can be written in English and are not Polish dictionary aliases. The current dictionary does **not** include proposed utility-type translations such as `wybierz` → `Pick` or `ogólny` → `generic`.

## Example: `.plts` to `.ts`

Input:

```ts
// greeting.plts
eksportuj funkcja powitaj(imie: ciąg): ciąg {
  zwróć "Cześć, " + imie;
}
```

Generated TypeScript (formatting may vary with Babel):

```ts
export function powitaj(imie: string): string {
  return "Cześć, " + imie;
}
```

## React and TSX

Use ordinary JSX tags, React props, and hook names. PolishTS does not translate HTML tag names, component names, prop names, hook APIs, JSX text, or quoted attribute values. Code inside JSX expression braces is PolishTS/TypeScript code and is passed through the same keyword translator.

```tsx
// App.pltsx
typ Props = { imię: ciąg };

eksportuj funkcja Powitanie({ imię }: Props) {
  zwróć <h1>Cześć, {imię}!</h1>;
}
```

The checked-in [React + Vite starter](examples/react-vite/) demonstrates a runnable project. From a repository checkout:

```sh
cd examples/react-vite
npm ci
npm run dev       # translate .pltsx, then start Vite
npm run typecheck # translate, then run tsc --noEmit
npm run build     # translate, type-check, then create a Vite production build
```

The starter uses TypeScript's `jsx: "react-jsx"`. PolishTS preserves JSX syntax; the project's TypeScript/Vite configuration controls the JSX runtime. The output is not converted to `React.createElement` by PolishTS.

## How translation works

1. The lexer scans Unicode identifiers, trivia/comments, quoted strings, template literals, regular-expression literals, and punctuation. It marks JSX tag/text regions when TSX mode is enabled.
2. The translator considers candidate Polish dictionary tokens and their nearby tokens. Some forms have dedicated contextual checks; others use the position heuristics described in the language spec.
3. Babel parses the translated text as a TypeScript module. TSX mode adds Babel's JSX parser plugin. Legacy decorators are enabled in both modes.
4. Babel's generator prints the parsed program. It may normalize whitespace and punctuation; comments are retained by default.

Babel parser errors are translated to `TranspileError` and mapped through the token offset table to the original Polish source. The map is for diagnostic locations only; PolishTS does not currently emit source map files.

## Current limitations

- This is not a full Polish-language grammar. It is a lexer plus context-sensitive token substitution before parsing.
- The template scanner treats the entire backtick literal as protected text. PolishTS words inside `${...}` are **not translated** in this version. Write standard TypeScript keywords inside template interpolations.
- Context checks for operators and type words are heuristic. A Polish dictionary spelling used as an identifier in an ambiguous expression may still be translated or may not be translated where intended. Tests cover common cases, not every valid TypeScript parse.
- JSX detection is lexical and heuristic. Standard tags, attributes, child text, and expressions are tested; uncommon or deeply nested grammar edge cases may require a fix before use.
- Babel parser acceptance does not guarantee that `tsc` accepts the output or that it type-checks. PolishTS does not run TypeScript's checker.
- Output formatting is generated by Babel. Formatting-preserving edits, source maps, watch mode, and Vite plugins are not provided. Project mode performs a one-shot directory translation; it does not watch for changes or type-check the generated tree.
- The selected Babel parser release determines which TypeScript syntax can be parsed. The library parser adapter can replace the parser function, but `version` is informational.

## Development and verification

```sh
npm ci
npm run build
npm test
npm run package:smoke
npm pack --dry-run
```

`npm test` includes CLI tests, dictionary/transpilation regressions, grammar fixtures, deterministic Unicode/large-input checks, TS/TSX compiler checks, and the React starter source/output contract. `npm run package:smoke` packs the package, installs that tarball in a temporary consumer, then exercises the CLI and library API. `npm run benchmark` reports a median for a generated 10,000-declaration input; it is informational and has no CI performance threshold.

GitHub Actions tests Node 18, 20, 22, 24, and 26. A separate clean-install job runs `npm ci` and the production build for the React starter. Publishing from `main` is gated on both jobs. See [`docs/RELEASING.md`](docs/RELEASING.md) for the current release process and [`CHANGELOG.md`](CHANGELOG.md) for changes.
