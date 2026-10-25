# PolishTS language contract 0.3

Polish translation: [`LANGUAGE_SPEC.pl.md`](LANGUAGE_SPEC.pl.md). This document describes the vocabulary currently present in `src/dictionary.ts` and the behavior implemented by the lexer, translator, and parser. “Dictionary entry” does not mean “unconditional replacement”: translation depends on token kind and nearby tokens.

## 1. Processing model

The implementation runs these stages:

1. `lex(source)` creates tokens with UTF-16 offsets. It recognizes Unicode identifiers, whitespace, line/block comments, single/double-quoted strings, whole template literals, regex-like literals, and punctuation. In JSX mode, an additional lexical pass marks tag, attribute-name, and child-text tokens.
2. `translate(source)` changes selected identifier tokens using `DICTIONARY` and context heuristics. Comments and literal tokens are copied. JSX-marked tokens are not translated. It also creates an output-offset-to-source-offset table.
3. Babel parses the translated text as a TypeScript module. `jsx: true` enables JSX; legacy decorators are enabled in both modes.
4. Babel generator emits formatted source code with comments enabled.

The implementation is not a Polish grammar parser and does not translate a TypeScript AST. It substitutes lexical tokens before parsing. This distinction matters for ambiguous dictionary words and is why the rules below describe current behavior rather than a complete language design.

## 2. Supported input modes and parser

| Input/use | JSX parser | Intended output |
| --- | --- | --- |
| `transpile(source)` | Disabled | TypeScript text |
| `transpile(source, { jsx: true })` | Enabled | TypeScript text preserving JSX |
| CLI `.plts` | Disabled unless `--tsx` | `.ts` |
| CLI `.pltsx` | Enabled automatically | `.tsx` |
| CLI `--tsx` | Enabled | `.tsx` by default for file input |

The bundled parser is `@babel/parser` resolved by the package lock. It uses Babel's `typescript` plugin and `decorators-legacy`; TSX additionally uses `jsx`. The public `ParserAdapter` lets a caller replace the parser function. Its `version` property is informational; the implementation does not enforce a TypeScript grammar version or configure TypeScript compiler options.

The grammar therefore follows the selected Babel parser release. Type checking and target/compiler compatibility are separate checks performed by TypeScript (`tsc`).

## 3. Translation vocabulary

This table is generated from the current implementation dictionary. The context column summarizes the implemented behavior; it is not a promise that every syntactic position is recognized.

| Input token(s) | Output token(s) | Current context / notes |
| --- | --- | --- |
| `stała` | `const` | Variable declaration keyword |
| `zmienna` | `let` | Variable declaration keyword |
| `var` | `var` | No-op entry |
| `liczba` | `number` | Translated when the preceding token suggests a type position (`:`, `<`, `|`, `&`, `as`, `extends`, `implements`, `)`) |
| `ciąg`, `łańcuch` | `string` | Same type-position heuristic |
| `logiczna` | `boolean` | Same type-position heuristic |
| `dowolny` | `any` | Same type-position heuristic |
| `nieznany` | `unknown` | Same type-position heuristic |
| `nic` | `void` | Same type-position heuristic |
| `nigdy` | `never` | Same type-position heuristic |
| `obiekt` | `object` | Same type-position heuristic |
| `symbol` | `symbol` | Same type-position heuristic; no visible spelling change |
| `duża_liczba` | `bigint` | Same type-position heuristic |
| `prawda`, `fałsz` | `true`, `false` | Boolean-literal heuristic; a following `:` protects likely property/parameter names |
| `nieokreślony` | `undefined` | Value-position heuristic |
| `i` | `&&` | Only when previous and next tokens look like expression operands; not a general word replacement |
| `lub` | `||` | Operator-position heuristic |
| `nie` | `!` | Operator/value-position heuristic; member/property/declaration names are protected in common forms |
| `równa`, `różne` | `===`, `!==` | Operator-position heuristic |
| `mniejsze`, `większe` | `<`, `>` | Operator-position heuristic; do not use as Polish generic delimiters |
| `mniejsze_równe`, `większe_równe` | `<=`, `>=` | Operator-position heuristic |
| `przypisz` | `=` | Assignment token |
| `plus_równa`, `minus_równa`, `razy_równa` | `+=`, `-=`, `*=` | Compound assignment tokens |
| `podziel_równo`, `modulo_równa` | `/=`, `%=` | Compound assignment tokens |
| `pytajnik_kropka`, `podwójne_pytajnik` | `?.`, `??` | Optional chaining/nullish coalescing tokens |
| `jeżeli`, `inaczej` | `if`, `else` | Statement-position heuristic |
| `dla`, `dopóki`, `zrób` | `for`, `while`, `do` | Statement-position heuristic |
| `przerwij`, `kontynuuj`, `zwróć` | `break`, `continue`, `return` | Statement-position heuristic |
| `przypadku` | `case` | Switch label keyword |
| `domyślny` | `default` | Currently recognized for a `default:`-like token position |
| `funkcja` | `function` | Declaration-position heuristic |
| `asynchroniczna`, `oczekuj` | `async`, `await` | Dictionary entries; use/test in ordinary TS positions |
| `klasa` | `class` | Declaration-position heuristic |
| `rozszerza` | `extends` | Dictionary entry; class/type context is parsed by Babel |
| `implementuj` | `implements` | Class declaration modifier |
| `konstruktor` | `constructor` | Class member token |
| `modyfikator`, `tylko_czytelny` | `readonly` | Modifier tokens |
| `publiczny`, `publiczne` | `public` | Modifier tokens |
| `prywatny`, `prywatne` | `private` | Modifier tokens |
| `chroniony`, `chronione` | `protected` | Modifier tokens |
| `statyczny`, `abstrakcyjna` | `static`, `abstract` | Modifier tokens |
| `ten`, `rodzaj`, `instancja` | `this`, `typeof`, `instanceof` | Dictionary replacements subject to identifier protection; context is not fully AST-aware |
| `interfejs`, `typ` | `interface`, `type` | Declaration-position heuristic |
| `enumeracja`, `wyliczenie` | `enum` | Declaration-position heuristic |
| `importuj`, `eksportuj` | `import`, `export` | Module declaration positions |
| `domyślny_eksport` | `export default` | Multi-token replacement |
| `jako` | `as` | Alias/type assertion token |
| `z` | `from` | Only when a preceding import/export token is found and the next significant token is a literal |
| `narzędzie`, `klucze` | `keyof` | Type-position heuristic |
| `spełnia` | `satisfies` | TypeScript `satisfies` token |
| `spróbuj`, `złap`, `na_koniec`, `rzuć` | `try`, `catch`, `finally`, `throw` | Statement-position heuristic |

The dictionary does not contain `switch`, `new`, `null`, `implements`, `extends`, `as`, `from`, or `=>` as Polish aliases. Those standard TypeScript tokens can be written directly. `wybierz`, `pomiń`, `częściowy`, `wymagany`, `ogólny`, `duża_liczca`, `arrow`, `błąd`, and `nowy_błąd` are not current dictionary entries.

## 4. Names, literals, comments, and JSX

### Names

The intended convention is to preserve user-defined names, including Polish identifiers: variable/function/class/component names, parameter names, object properties, type names, import aliases, JSX tags, and props. Tests cover representative declaration names, parameters, object keys, member properties, import aliases, and type names.

The translator has a limited `declaredNames` guard plus position heuristics. It is not a symbol-table or scope-aware resolver. A dictionary spelling used as a name in an untested or ambiguous position can still be changed. In particular, do not assume every spelling in this table is safe as an arbitrary identifier in every valid TypeScript context.

### Comments and literals

Line comments, block comments, single-quoted strings, and double-quoted strings are lexed as opaque tokens and copied. Escapes in quoted strings are scanned so that escaped quotes do not end the token early. Regex-like literals are scanned and copied using a heuristic that decides whether `/` begins a regex or division.

A complete backtick template, including `${...}` interpolations, is currently treated as one opaque literal. Consequently, Polish keywords inside an interpolation are not translated. For example, write `true` rather than `prawda` inside `` `${...}` `` until interpolation-aware lexing is implemented.

### JSX

JSX is available only when the parser is explicitly in JSX mode. The CLI selects this mode for `.pltsx` and `--tsx`; library callers use `{ jsx: true }`. In JSX mode the lexer attempts to protect tag names, attribute names, child text, and quoted attribute values. Tokens inside `{ ... }` are treated as code and may be translated. JSX recognition is a lexical heuristic rather than Babel-AST traversal, so unusual syntax may not be handled correctly.

PolishTS preserves JSX for the downstream TypeScript/React toolchain. It does not lower JSX to `React.createElement`. TypeScript's `jsx` option (`react-jsx`, `react`, or `preserve`) is configured by the consuming project.

## 5. TypeScript syntax and pass-through

The translator does not rewrite unlisted identifiers or syntax tokens. Babel then parses the result as TypeScript (and optionally JSX). Common TS constructs tested in this repository include unions/intersections, literal types, tuple types, `keyof`, `typeof`, indexed access, generic parameters, constraints/defaults, `implements`, `satisfies`, `switch`, and TSX forms. The compatibility tests compile selected output with the repository's resolved TypeScript compiler; they are representative coverage, not proof of support for every TypeScript feature.

Some Polish primitive type words are translated only after selected preceding tokens. In particular, the implementation's type-word check is a short predecessor list, not a complete type parser. A Polish primitive in a type-alias right-hand side or another untested position may remain untranslated. Write the standard TypeScript spelling in uncertain positions or add a regression/`tsc` test before relying on the form.

Unknown TypeScript syntax passes through the translator unchanged unless it contains a recognized Polish spelling that matches a replacement heuristic. Babel must still accept the result. There is no configured “TypeScript language version” option: the selected Babel parser release controls parser grammar. The library's `ParserAdapter` can replace the parse function, but no parser/TypeScript version negotiation is performed.

## 6. Diagnostics and output

`TranspileError` exposes `kind: 'parse' | 'transform'`, a message, an optional one-based `location`, and the parser/generator failure in `cause`. Parse positions are converted from translated text offsets to the original source with a token-offset table. The translator does not currently emit source-map files.

Babel generator can normalize whitespace, semicolons, and line wrapping. The output is TypeScript/TSX source, not JavaScript. PolishTS does not type-check, resolve imports, execute code, or bundle a project.

## 7. Grammar versioning

`LANGUAGE_VERSION` is exported by the package and currently equals `0.3`. It versions the documented Polish vocabulary/behavior, not the npm package or the Babel/TypeScript parser. Compatibility and release policy is described in [`docs/RELEASING.md`](docs/RELEASING.md). Every stable vocabulary change should update this document, its Polish counterpart, tests, and `LANGUAGE_VERSION` when the contract version changes.
