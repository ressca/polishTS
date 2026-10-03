#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { transpile, TranspileError } from './index.js';

function showHelp(): void {
  console.log(`
Polish TypeScript Transpiler (plts)

Usage:
  plts <input> [output]
  plts <input> --out <output>
  plts <input> --print
  plts --stdin

Options:
  --stdin   Read from standard input
  --out     Write to the given output path (defaults to the input basename in the current directory)
  --print   Write generated code to stdout instead of a file
  --help    Show this help message

Examples:
  plts program.plts          Write program.ts in the current directory
  plts program.plts out.ts   Write to out.ts in the current directory
  plts program.plts --out out.ts
  plts program.plts --print
  plts program.plts dist/out.ts  Write to dist/out.ts
  plts --stdin < program.plts
`);
}

function formatError(error: unknown): string {
  if (error instanceof TranspileError) {
    return error.location
      ? `${error.message} (line ${error.location.line}, column ${error.location.column})`
      : error.message;
  }
  const e = error as NodeJS.ErrnoException;
  if (e?.code === 'ENOENT') return `file not found: ${e.path ?? 'requested path'}`;
  if (e?.code === 'EACCES' || e?.code === 'EPERM' || e?.code === 'EISDIR') return `cannot access file: ${e.path ?? 'requested path'}`;
  return e?.message ?? 'operation failed';
}

function fail(error: unknown): void {
  console.error(`Error: ${formatError(error)}`);
  process.exitCode = 1;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const stdinMode = args.includes('--stdin');
  const printMode = args.includes('--print');
  let outputOption: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--stdin' || arg === '--print') continue;
    if (arg === '--out') {
      const value = args[++i];
      if (!value || value.startsWith('--')) {
        console.error('Error: --out requires an output path');
        process.exitCode = 1;
        return;
      }
      if (outputOption !== undefined) {
        console.error('Error: --out may be specified only once');
        process.exitCode = 1;
        return;
      }
      outputOption = value;
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Error: unknown option: ${arg}`);
      process.exitCode = 1;
      return;
    }
    positional.push(arg);
  }

  if (stdinMode && (positional.length || outputOption || printMode)) {
    console.error('Error: --stdin cannot be combined with an input file, --out, or --print');
    process.exitCode = 1;
    return;
  }
  if (printMode && (outputOption || positional.length > 1)) {
    console.error('Error: --print cannot be combined with an output path');
    process.exitCode = 1;
    return;
  }

  if (stdinMode) {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { input += chunk; });
    process.stdin.on('error', fail);
    process.stdin.on('end', () => {
      try {
        process.stdout.write(`${transpile(input)}\n`);
      } catch (error) {
        fail(error);
      }
    });
    return;
  }

  const inputFile = positional[0];
  if (!inputFile) {
    console.error('Error: missing input file (use --stdin to read standard input)');
    process.exitCode = 1;
    return;
  }

  try {
    const inputPath = path.resolve(inputFile);
    const source = fs.readFileSync(inputPath, 'utf8');
    const output = transpile(source);
    const defaultOutputName = `${path.basename(inputFile, path.extname(inputFile))}.ts`;
    const legacyOutput = positional[1];
    if (legacyOutput && outputOption) {
      console.error('Error: specify the output path either positionally or with --out, not both');
      process.exitCode = 1;
      return;
    }
    if (positional.length > 2) {
      console.error('Error: too many arguments');
      process.exitCode = 1;
      return;
    }
    if (printMode) {
      process.stdout.write(`${output}\n`);
      return;
    }
    const outputPath = path.resolve(outputOption ?? legacyOutput ?? defaultOutputName);
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`Transpiled: ${inputFile} -> ${outputPath}`);
  } catch (error) {
    fail(error);
  }
}

main();
