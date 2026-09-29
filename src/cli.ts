#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { parse } from './parser.js';
import { generateCode } from './generator.js';
import type { Program } from '@babel/types';

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

function transpile(source: string): string {
  const ast = parse(source) as { program: Program };
  return generateCode(ast.program);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--stdin')) {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => { input += chunk; });
    process.stdin.on('end', () => {
      console.log(transpile(input));
    });
    return;
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!inputFile) {
    showHelp();
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: file not found: ${inputFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(inputPath, 'utf-8');
  const result = transpile(source);
  const defaultOutputName = `${path.basename(inputFile, path.extname(inputFile))}.ts`;
  const outputPath = path.resolve(outputFile ?? defaultOutputName);
  fs.writeFileSync(outputPath, result, 'utf-8');
  console.log(`Transpiled: ${inputFile} -> ${outputPath}`);
}

main();
