import type { Program } from '@babel/types';
import * as babelGenerate from '@babel/generator';

export interface GenerateOptions {
  comments?: boolean;
  compact?: boolean;
  concise?: boolean;
}

export function generateCode(ast: Program, options: GenerateOptions = {}): string {
  const gen = babelGenerate as unknown as {
    generate: (node: Program, opts?: Record<string, unknown>, code?: string) => { code: string };
  };
  const { code } = gen.generate(ast, {
    comments: options.comments ?? true,
    compact: options.compact ?? false,
    concise: options.concise ?? false,
    retainLines: false,
  });

  return code;
}
