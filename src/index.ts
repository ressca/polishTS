import { parse } from './parser.js';
import { generateCode } from './generator.js';
import { TranspileError } from './errors.js';

export { TranspileError } from './errors.js';

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

export function transpile(source: string): string {
  let ast;
  try {
    ast = parse(source);
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
