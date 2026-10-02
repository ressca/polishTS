# PolishTS

PolishTS (`polishts`) translates Polish-keyword, TypeScript-like source (`.plts`)
into **TypeScript** (`.ts`). It token-replaces selected whole words, parses the
result with Babel's TypeScript and legacy-decorator plugins, then prints the
AST. It does not compile or emit JavaScript.

## Requirements and use

Supported runtime range: **Node.js 18 and newer (`>=18`)**. The package does
not declare an `engines` field, so there is no upper bound established by its
metadata; Node 18 is the minimum recommended version based on the current
development dependencies. Newer versions are not individually guaranteed or
tested by this package.

Install with `npm install polishts` (or globally with
`npm install --global polishts`). Then:

```sh
plts program.plts                 # writes ./program.ts
plts program.plts out/result.ts   # writes the given path
cat program.plts | plts --stdin   # generated TypeScript on stdout
plts --help
```

The intended file workflow is to write Polish-keyword source in a `.plts` file
and run `plts` to create TypeScript in a `.ts` file. For example, save the
source as `program.plts`, run `plts program.plts`, then inspect or use the
generated `program.ts` with your TypeScript tooling. PolishTS itself does not
type-check or execute the result. Use `plts program.plts output.ts` to choose a
different output path, or `plts --stdin` when piping source instead of using a
file.

Without `--stdin`, the first argument is the input file and the optional second
argument is the output file. The default output is the input basename with a
`.ts` extension in the current directory. Input and output paths are resolved
from the current directory. The CLI prints a success message for file output;
stdin mode prints only generated code. Missing input arguments and missing input
files exit with status 1. Parse and file errors are not caught by the CLI.

Library callers can use:

```ts
import { transpile } from 'polishts';

const { code, ast } = transpile('stała wynik: liczba przypisz 42');
// code: "const wynik: number = 42;"
// ast: Babel Program
```

`transpile` returns generated TypeScript and its Babel `Program` AST. Invalid
translated syntax throws a Babel parse error.

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

Current dictionary mappings (source word → TypeScript token):

| Area | Mappings |
| --- | --- |
| Declarations and types | `stała` → `const`; `zmienna` → `let`; `var` → `var`; `liczba` → `number`; `ciąg`, `łańcuch` → `string`; `logiczna` → `boolean`; `dowolny` → `any`; `nieznany` → `unknown`; `nic` → `void`; `nigdy` → `never`; `obiekt` → `object`; `symbol` → `symbol`; `duża_liczca` → `bigint` |
| Values and operators | `prawda` → `true`; `fałsz` → `false`; `nieokreślony` → `undefined`; `i` → `&&`; `lub` → `||`; `nie` → `!`; `równa` → `===`; `różne` → `!==`; `mniejsze`, `większe`, `mniejsze_równe`, `większe_równe` → `<`, `>`, `<=`, `>=`; `przypisz` → `=`; `plus_równa`, `minus_równa`, `razy_równa`, `podziel_równo`, `modulo_równa` → `+=`, `-=`, `*=`, `/=`, `%=`; `pytajnik_kropka` → `?.`; `podwójne_pytajnik` → `??` |
| Control flow | `jeżeli` → `if`; `inaczej` → `else`; `dla` → `for`; `dopóki` → `while`; `zrób` → `do`; `przerwij` → `break`; `kontynuuj` → `continue`; `zwróć` → `return`; `przypadku` → `case`; `domyślny` → `default` |
| Functions and classes | `funkcja` → `function`; `asynchroniczna` → `async`; `oczekuj` → `await`; `arrow` → `=>`; `klasa` → `class`; `rozszerza` → `extends`; `konstruktor` → `constructor`; `modyfikator`, `tylko_czytelny` → `readonly`; `publiczny`, `publiczne` → `public`; `prywatny`, `prywatne` → `private`; `chroniony`, `chronione` → `protected`; `statyczny` → `static`; `abstrakcyjna` → `abstract`; `ten` → `this`; `rodzaj` → `typeof`; `instancja` → `instanceof` |
| Types, modules, errors | `interfejs` → `interface`; `typ` → `type`; `enumeracja`, `wyliczenie` → `enum`; `importuj` → `import`; `eksportuj` → `export`; `domyślny_eksport` → `export default`; `jako` → `as`; `narzędzie` → `keyof`; `spróbuj` → `try`; `złap` → `catch`; `na_koniec` → `finally`; `rzuć` → `throw`; `błąd` → `Error`; `nowy_błąd` → `new Error` |

The dictionary also contains several mappings that currently do not form a
reliable PolishTS syntax: `z` is filtered out by the tokenizer's keyword
selection; `wybierz`, `pomiń`, `częściowy`, `wymagany`, and `ogólny` map to
lowercase `pick`, `omit`, `partial`, `required`, and `generic`; and the English
words `switch`, `implements`, `new`, `null`, and `extends` are dictionary
entries (with `rozszerz` also mapping to `extends`). These are substitutions,
not implemented language constructs or type utilities. Their intended Polish
forms/semantics are undecided. `implementuj` maps to `implements`.

## Pass-through and limits

Strings delimited by single or double quotes, `//` comments, and `/* ... */`
comments are copied through the keyword pass, so words inside them are not
translated. A larger identifier is not rewritten just because it contains a
keyword: `stalaNazwa` remains `stalaNazwa`. Other source is passed to Babel
after keyword substitution; Babel may normalize formatting when generating
output. Generator options such as compact output are not exposed by
`transpile` or the CLI.

The tokenizer is deliberately small: template literals, regular-expression
literals, and full TypeScript lexical rules are not handled as protected token
forms. Do not rely on Polish words inside these forms remaining unchanged. The
code is parsed, not type-checked, and output is not JavaScript. The transformer
visitor is empty, so no AST-level transforms run. Dictionary entries are
implementation data; exact supported syntax beyond the demonstrated and valid
substitutions is undecided.

`npm test` runs the tests and `npm run build` emits the package files to `dist`.
`npm run prepack` builds before packing.
