import * as babelParser from '@babel/parser';
import { TranspileError } from './errors.js';
import { translate } from './translator.js';

export const LANGUAGE_VERSION = '0.1';

export function parseLanguage(source: string) {
  const translated = translate(source);
  try {
    return babelParser.parse(translated.code, {
      sourceType: 'module',
      plugins: ['typescript', 'decorators-legacy'],
    });
  } catch (cause) {
    const error = cause as { message?: string; pos?: number; loc?: { line?: number; column?: number } };
    const generatedPos = typeof error.pos === 'number' ? error.pos : undefined;
    const originalPos = generatedPos === undefined
      ? undefined
      : translated.sourceOffsets[Math.min(generatedPos, translated.sourceOffsets.length - 1)];
    const prefix = originalPos === undefined ? source.slice(0, 0) : source.slice(0, originalPos);
    const line = (prefix.match(/\n/g)?.length ?? 0) + 1;
    const lastNewline = prefix.lastIndexOf('\n');
    const column = originalPos === undefined ? undefined : originalPos - lastNewline;
    const message = (error.message ?? 'Invalid source').replace(/ \(\d+:\d+\)$/, '');
    throw new TranspileError(message, {
      kind: 'parse',
      ...(column === undefined ? {} : { location: { line, column } }),
      cause,
    });
  }
}
