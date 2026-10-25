# PolishTS

PolishTS (`polishts`) translates Polish-keyword, TypeScript-like source (`.plts`)
into **TypeScript** (`.ts`). It lexes the source, translates recognized Polish
syntax in context, parses the result with Babel's TypeScript and legacy-decorator
plugins, then prints the AST. It does not compile or emit JavaScript.

The current language contract is version **0.3** (`LANGUAGE_SPEC.md`). Unknown
TypeScript syntax is passed through unchanged when Babel accepts it; unsupported
or invalid syntax produces a parse error. Source locations refer to the original
`.plts` input. The translator protects comments, quoted strings, template
literals, and regular-expression literals, and uses syntactic context for
declarations, operators, and type names. TSX parsing is enabled explicitly or
automatically for `.pltsx` inputs.

Library callers may pin a compatible `@babel/parser` release by passing a
`parser` adapter to `transpile(source, { parser })`; the adapter supplies its
version label and the parser's `parse` function. The bundled parser remains the
default. Parser grammar follows the selected Babel release, while generated
output can be checked with the TypeScript compiler version used by the project.

## Requirements and use

Supported runtime range: **Node.js 18 and newer (`>=18`)**, as declared by the
package metadata. CI checks Node 18, 20, 22, 24, and 26.

Install with `npm install polishts` (or globally with
`npm install --global polishts`). Then:

```sh
plts program.plts                 # writes ./program.ts
plts program.plts out/result.ts   # writes the given path
plts program.plts --out out/result.ts
plts program.plts --print         # generated TypeScript on stdout
cat program.plts | plts --stdin   # generated TypeScript on stdout
plts --help
```

### React / TSX

Use `.pltsx` for PolishTS files containing JSX. The extension enables TSX parsing
and selects `.tsx` as the default output. For other input names, pass `--tsx`;
library callers use `transpile(source, { jsx: true })`. PolishTS preserves JSX
for TypeScript to handle: `jsx: "react-jsx"`, `"react"`, and `"preserve"` remain
project choices in `tsconfig.json`.

The runnable [Vite + React example](examples/react-vite/) includes a `.pltsx`
component, its generated `.tsx` counterpart, and scripts that translate before
development, type checking, and production builds:

```sh
cd examples/react-vite
npm install
npm run dev
npm run build
```

Its `tsconfig.json` uses `"jsx": "react-jsx"` and `"moduleResolution": "Bundler"`;
the generated `src/App.tsx` is included alongside the handwritten TSX entry
point. Set `jsx` to `"react"` or `"preserve"` if that matches an existing
project; PolishTS leaves the JSX syntax in place for the selected TypeScript
toolchain.

The example pins exact React, Vite, TypeScript, plugin, and React type package
versions in its manifest.
Vite 8 requires Node.js 20.19+ or 22.12+; see the [Vite compatibility note](https://www.npmjs.com/package/create-vite).

The intended file workflow is to write Polish-keyword source in a `.plts` file
and run `plts` to create TypeScript in a `.ts` file. For example, save the
source as `program.plts`, run `plts program.plts`, then inspect or use the
generated `program.ts` with your TypeScript tooling. PolishTS itself does not
type-check or execute the result. Use `plts program.plts output.ts` or
`plts program.plts --out output.ts` to choose a different output path. By
default, output is written to the current working directory using the input
basename, even when the input is elsewhere. Use `--print` to send generated
code to stdout instead of writing a file, or `plts --stdin` when piping source.

Without `--stdin`, the first argument is the input file and the optional second
argument is the output file. The default output is the input basename with a
`.ts` extension in the current directory. Input and output paths are resolved
from the current directory. The CLI prints a success message for file output;
`--print` and stdin mode print only generated code to stdout. Errors (including
missing input, unreadable files, invalid source, and output write failures) are
reported to stderr and exit with status 1.

Library callers can use:

```ts
import { transpile, TranspileError } from 'polishts';

const code = transpile('stała wynik: liczba przypisz 42');
// "const wynik: number = 42;"

try {
  transpile('stała =');
} catch (error) {
  if (error instanceof TranspileError) {
    console.error(error.message, error.location); // location is present when Babel provides one
  }
}
```

`transpile` returns generated TypeScript as a string. Invalid translated syntax
throws `TranspileError`, with `kind` (`parse` or `transform`), a clear message,
optional one-based `location` (`line` and `column`), and the original parser
failure available as `cause`. The Babel AST remains an implementation detail.

## Examples

The [`examples`](examples/) directory contains `.plts` source files:

- [`hello.plts`](examples/hello.plts): a typed function and call.
- [`tasks.plts`](examples/tasks.plts): an interface, implementing class,
  method, and loop.
- [`retry.plts`](examples/retry.plts): async/await and try/catch error handling.

Run one with `plts examples/tasks.plts`; the CLI writes `tasks.ts` in the
current directory. The generated TypeScript for each example is the result of
that command.

## Language currently recognized

The mappings below apply to an entire identifier, and matching is
case-sensitive. Unlisted TypeScript/JavaScript syntax can be written directly.
For example:

```ts
// program.plts
eksportuj funkcja powitaj(imie: ciąg): ciąg {
  zwróć "Cześć, " + imie;
}
```

Generated TypeScript:

```ts
export function powitaj(imie: string): string {
  return "Cześć, " + imie;
}
```

A declaration and type annotation:

```ts
// values.plts
stała wynik: liczba przypisz 42;
```

```ts
// generated TypeScript
const wynik: number = 42;
```

Control flow and operators are substitutions too:

```ts
// program.plts
jeżeli (prawda i nie fałsz) {
  stała wynik: liczba przypisz 1;
} inaczej {
  stała wynik: liczba przypisz 0;
}
```

```ts
// generated TypeScript
if (true && !false) {
  const wynik: number = 1;
} else {
  const wynik: number = 0;
}
```

The complete stable dictionary decisions and their contextual rules are listed
in [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md). The implemented core mappings include:

| Area | Mappings |
| --- | --- |
| Deklaracje i typy | `stała` → `const`; `zmienna` → `let`; `liczba` → `number`; `ciąg`, `łańcuch` → `string`; `logiczna` → `boolean`; `dowolny`, `nieznany`, `nic`, `nigdy`, `obiekt`, `symbol`, `duża_liczba` → odpowiadające im typy TypeScript |
| Wartości i operatory | `prawda`, `fałsz`, `nieokreślony`; `i`, `lub`, `nie`; `równa`, `różne`, `mniejsze`, `większe`, `mniejsze_równe`, `większe_równe`; `przypisz` i aliasy przypisań; `pytajnik_kropka`, `podwójne_pytajnik` |
| Sterowanie przepływem | `jeżeli`, `inaczej`, `dla`, `dopóki`, `zrób`, `przerwij`, `kontynuuj`, `zwróć`, `przypadku`, `domyślny` |
| Funkcje, klasy i moduły | `funkcja`, `asynchroniczna`, `oczekuj`, `klasa`, `rozszerza`, `implementuj`, `konstruktor`, modyfikatory klas, `interfejs`, `typ`, `enumeracja`, `importuj`, `eksportuj`, `domyślny_eksport`, `jako`, kontekstowe `z`, `narzędzie`/`klucze`, `spełnia` |

Nieobsługiwane propozycje oraz zwykłe angielskie konstrukcje TS opisuje tabela
decyzji w specyfikacji; nie są one częścią słownika tylko dlatego, że przypominają
alias składni.

## Pass-through and limits

Comments, string/regex/template literals and JSX text are preserved by the
lexer; recognized keywords in code expressions are translated. JSX is enabled
only in TSX mode, and its tags/attributes remain intact. Babel may normalize
formatting when generating output. PolishTS parses but does not type-check the
result; use `tsc --noEmit` for type checking. See [`LANGUAGE_SPEC.md`](LANGUAGE_SPEC.md)
for contextual rules and known limits.

`npm test` runs unit, fixture, property, regression, TS/TSX compilation and
React contract tests. `npm run package:smoke` installs and exercises a packed
tarball. `npm run benchmark` reports a repeatable large-file timing (informative,
not yet a CI threshold). Release and compatibility policy lives in
[`docs/releasing.md`](docs/releasing.md); changes are tracked in
[`CHANGELOG.md`](CHANGELOG.md).

## CI and npm publishing

GitHub Actions runs the build, tests, package smoke test, and `npm pack
--dry-run` for pull requests targeting `dev` or `main`, and for pushes to those
branches. The Node matrix tests representative supported majors from the
declared `>=18` range. A push to `main` publishes the package after every matrix
job passes.

Publishing uses npm trusted publishing (GitHub Actions OIDC), so no npm token
needs to be stored in GitHub. To enable it:

1. If `polishts` has not been published yet, create its first release from your
   machine: run `npm login`, choose a unique version in `package.json`, run
   `npm ci && npm run build`, then run `npm publish --access public`.
2. On npmjs.com, open the `polishts` package settings and add a GitHub Actions
   trusted publisher. Set the owner to `ressca`, repository to `polishTS`, and
   workflow filename to `ci.yml`. Allow direct `npm publish` for this
   publisher.
3. Before each release, bump `version` in `package.json` (and
   `package-lock.json`) and merge the change to `main`. The `main` workflow
   publishes that version after CI succeeds; npm will reject a version that
   has already been published.

The publish workflow uses Node 24 because npm trusted publishing requires Node
22.14 or newer and npm 11.5.1 or newer.
