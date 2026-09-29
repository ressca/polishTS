import type { Program } from '@babel/types';
import { DICTIONARY } from './dictionary.js';
import { parse } from './parser.js';
import { createTransformer, type TransformContext, type Visitor } from './transformer.js';
import { generateCode, type GenerateOptions } from './generator.js';

export interface TranspileResult {
  code: string;
  ast: Program;
}

export function transpile(source: string): TranspileResult {
  const ast = parse(source) as { program: Program };
  const code = generateCode(ast.program);
  return { code, ast: ast.program };
}
