# polishts

`polishts` translates TypeScript-like source written with Polish keywords into
standard TypeScript. It provides a command line program named `plts` 

## Install

Install the command globally to use `plts` from any directory:

```sh
npm install --global polishts
```

You can also install it in a project:

```sh
npm install polishts
```

## Command line

Pass an input file and optionally an output path. By default, the output gets
the same base name with a `.ts` extension and is written in the directory where
you run the command. Paths supplied by the user are also resolved relative to
that directory.

```sh
plts program.plts
# writes ./program.ts

plts program.plts program.ts
# writes ./program.ts

plts program.plts dist/generated.ts
# writes ./dist/generated.ts
```

Use `--stdin` to read from standard input and print generated TypeScript to
standard output:

```sh
plts program.plts > program.ts
```

You can also pipe source through standard input:

```sh
cat program.plts | plts --stdin > program.ts
```

Use `plts --help` for the available command options.

## Library API

```ts
import { transpile } from 'polishts';

const { code, ast } = transpile('stała wynik: liczba przypisz 42');
console.log(code); // const wynik: number = 42;
```

The result includes generated TypeScript in `code` and the parsed Babel
`Program` AST in `ast`.

## Build from source

```sh
npm install
npm test
npm run build
```

When the package is packed for publication, the build runs automatically and
the published package includes the compiled `dist` files.
