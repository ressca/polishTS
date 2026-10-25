import { LANGUAGE_VERSION, parseLanguage } from './language-parser.js';
import { generateCode } from './generator.js';
import { TranspileError } from './errors.js';
import type { ParserAdapter } from './language-parser.js';

export { TranspileError } from './errors.js';
export { LANGUAGE_VERSION };
export type { ParserAdapter } from './language-parser.js';

export interface TranspileOptions {
  /** Override the bundled Babel parser, for example to pin a project-specific parser release. */
  parser?: ParserAdapter;
  /** Enable TSX parsing while preserving JSX in the generated output. */
  jsx?: boolean;
}

function wrapFailure(cause: unknown, kind: 'parse' | 'transform'): TranspileError {
  const candidate = cause as { message?: string; loc?: { line?: number; column?: number } };
  const loc = candidate?.loc;
  const location = typeof loc?.line === 'number' && typeof loc.column === 'number'
    ? { line: loc.line, column: loc.column + 1 }
    : undefined;
  const raw = candidate?.message ?? `Unknown ${kind} failure`;
  const message = raw.replace(/ \(\d+:\d+\)$/, '');
  return new TranspileError(message, { kind, ...(location ? { location } : {}), cause });
}

export function transpile(source: string, options: TranspileOptions = {}): string {
  let ast;
  try {
    ast = parseLanguage(source, options.parser, options.jsx ?? false);
  } catch (cause) {
    if (cause instanceof TranspileError) throw cause;
    throw wrapFailure(cause, 'parse');
  }
  try {
    return generateCode(ast.program);
  } catch (cause) {
    throw wrapFailure(cause, 'transform');
  }
}
