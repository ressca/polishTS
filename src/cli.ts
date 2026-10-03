#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { transpile, TranspileError } from './index.js';

function showHelp(): void {
  console.log(`
Polish TypeScript Transpiler (plts)

Usage:
  plts <input> [output]
  plts --stdin

Options:
  --stdin   Read from standard input
  --help    Show this help message

Examples:
  plts program.plts          Write program.ts in the current directory
  plts program.plts out.ts   Write to out.ts in the current directory
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

  if (args.includes('--stdin')) {
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

  const inputFile = args[0];
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
    const outputPath = path.resolve(args[1] ?? defaultOutputName);
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`Transpiled: ${inputFile} -> ${outputPath}`);
  } catch (error) {
    fail(error);
  }
}

main();
