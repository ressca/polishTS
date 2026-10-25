import { DICTIONARY } from './dictionary.js';
import { lex, type Lexeme } from './lexer.js';

const contextual = new Set(['i', 'z', 'prawda', 'fałsz', 'nieokreślony', 'nie', 'lub', 'równa', 'różne', 'mniejsze', 'większe', 'mniejsze_równe', 'większe_równe']);
const declarationWords = new Set(['funkcja', 'klasa', 'interfejs', 'typ', 'enumeracja', 'wyliczenie', 'stała', 'zmienna', 'importuj', 'eksportuj']);
const nameIntroducers = new Set(['funkcja', 'klasa', 'interfejs', 'typ', 'enumeracja', 'wyliczenie', 'stała', 'zmienna']);
const typeWords = new Set(['liczba', 'ciąg', 'łańcuch', 'logiczna', 'dowolny', 'nieznany', 'nic', 'nigdy', 'obiekt', 'symbol', 'duża_liczca']);

function significant(tokens: Lexeme[], index: number, direction: -1 | 1): Lexeme | undefined {
  for (let i = index + direction; i >= 0 && i < tokens.length; i += direction) {
    if (tokens[i]!.kind !== 'trivia') return tokens[i];
  }
  return undefined;
}

function isDeclarationName(token: Lexeme, prev: Lexeme | undefined, next: Lexeme | undefined): boolean {
  if (prev?.value === '.' || prev?.value === '?.') return true;
  if (next?.value === ':') return true; // object keys and named parameters
  if (prev?.kind === 'identifier' && (nameIntroducers.has(prev.value) || ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum'].includes(prev.value))) return true;
  if (prev?.value === 'as') return true; // import/export alias
  if (prev?.value === '{' && next?.value === ',') return true;
  return false;
}

function shouldTranslate(word: string, prev: Lexeme | undefined, next: Lexeme | undefined, token: Lexeme): boolean {
  if (!(word in DICTIONARY)) return false;
  if (isDeclarationName(token, prev, next)) return false;
  if (typeWords.has(word)) return Boolean(prev && [':', '<', '|', '&', 'as', 'extends', 'implements', ')'].includes(prev.value));
  if (word === 'z') return prev?.value === '}' || prev?.kind === 'identifier' && /^(?:[\w$]+)$/.test(prev.value) && next?.kind === 'literal';
  if (word === 'i') return Boolean(prev && next && ![';', '{', '}', ',', ':', '=>'].includes(prev.value) && ![';', '{', '}', ',', ':', '=>'].includes(next.value));
  if (word === 'prawda' || word === 'fałsz' || word === 'nieokreślony') {
    if (prev?.value === ':') return false;
    return !next || [';', ')', ']', '}', ',', '.', '?.', '&&', '||', '??', '?', ':'].includes(next.value) || Boolean(prev && ['=', '(', '[', '{', ',', 'return', 'zwróć', '=>', '&&', '||', 'i', 'lub', 'nie'].includes(prev.value));
  }
  if (['nie', 'lub', 'równa', 'różne', 'mniejsze', 'większe', 'mniejsze_równe', 'większe_równe'].includes(word)) {
    return Boolean(prev && next && ![';', '{', '}', ',', ':', '=>'].includes(prev.value) && ![';', '{', '}', ',', ':', '=>'].includes(next.value));
  }
  // TypeScript keywords and declarations are translated only in plausible syntactic positions.
  if (['stała', 'zmienna', 'funkcja', 'klasa', 'interfejs', 'typ', 'enumeracja', 'wyliczenie', 'jeżeli', 'inaczej', 'dla', 'dopóki', 'zrób', 'przerwij', 'kontynuuj', 'zwróć', 'spróbuj', 'złap', 'na_koniec', 'rzuć', 'eksportuj', 'importuj'].includes(word)) {
    if (word === 'eksportuj' && next && (declarationWords.has(next.value) || next.value === 'domyślny_eksport')) return true;
    return !next || ['(', '{', '*', 'default'].includes(next.value) || !prev || [';', '{', '}', '(', 'export', 'eksportuj', 'default', 'domyślny_eksport', ')', 'else', 'inaczej', 'asynchroniczna', 'async'].includes(prev.value);
  }
  return !contextual.has(word);
}

export interface TranslatedSource {
  code: string;
  /** For each generated UTF-16 offset, the corresponding original source offset. */
  sourceOffsets: number[];
}

export function translate(source: string): TranslatedSource {
  const tokens = lex(source);
  const declaredNames = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind !== 'identifier') continue;
    const next = significant(tokens, i, 1);
    const prev = significant(tokens, i, -1);
    if (prev && (declarationWords.has(prev.value) || ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum'].includes(prev.value)) && !(token.value in DICTIONARY)) {
      declaredNames.add(token.value);
    }
  }
  let code = '';
  const sourceOffsets: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = significant(tokens, i, -1);
    const next = significant(tokens, i, 1);
    const value = token.kind === 'identifier' && !declaredNames.has(token.value) && shouldTranslate(token.value, prev, next, token)
      ? DICTIONARY[token.value]!
      : token.value;
    code += value;
    for (let j = 0; j < value.length; j++) {
      const relative = value.length === token.value.length ? j : Math.min(token.value.length - 1, Math.floor(j * token.value.length / value.length));
      sourceOffsets.push(token.start + Math.max(0, relative));
    }
  }
  sourceOffsets.push(source.length);
  return { code, sourceOffsets };
}
