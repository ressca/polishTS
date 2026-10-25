export type LexemeKind = 'identifier' | 'trivia' | 'literal' | 'punctuation' | 'jsx';

export interface Lexeme {
  kind: LexemeKind;
  value: string;
  start: number;
  end: number;
}

const idStart = /[$_\p{ID_Start}]/u;
const idContinue = /[$_\u200c\u200d\p{ID_Continue}]/u;

function isRegexStart(previous: Lexeme | undefined): boolean {
  if (!previous) return true;
  if (previous.kind === 'punctuation') return /^(?:[({[,:;=!?&|+*%^~<>-]|=>)$/.test(previous.value);
  return previous.kind === 'identifier' && /^(?:return|throw|case|delete|void|typeof|instanceof|in|of|yield|await)$/.test(previous.value);
}

function scanQuoted(source: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i] === quote) return i + 1;
    i++;
  }
  return source.length;
}

function scanTemplate(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i] === '`') return i + 1;
    // Template text and interpolations are protected as a single literal in language version 0.2.
    i++;
  }
  return source.length;
}

function scanRegex(source: string, start: number): number {
  let i = start + 1;
  let inClass = false;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '\\') { i += 2; continue; }
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) {
      i++;
      while (i < source.length && /[a-z]/i.test(source[i]!)) i++;
      return i;
    } else if (ch === '\n' || ch === '\r') return i;
    i++;
  }
  return source.length;
}

export function lex(source: string): Lexeme[] {
  const result: Lexeme[] = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    const ch = source[i]!;
    if (/\s/u.test(ch)) {
      while (i < source.length && /\s/u.test(source[i]!)) i++;
      result.push({ kind: 'trivia', value: source.slice(start, i), start, end: i });
    } else if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i++;
      result.push({ kind: 'trivia', value: source.slice(start, i), start, end: i });
    } else if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      const close = source.indexOf('*/', i);
      i = close < 0 ? source.length : close + 2;
      result.push({ kind: 'trivia', value: source.slice(start, i), start, end: i });
    } else if (ch === '"' || ch === "'") {
      i = scanQuoted(source, i, ch);
      result.push({ kind: 'literal', value: source.slice(start, i), start, end: i });
    } else if (ch === '`') {
      i = scanTemplate(source, i);
      result.push({ kind: 'literal', value: source.slice(start, i), start, end: i });
    } else {
      const cp = String.fromCodePoint(source.codePointAt(i)!);
      if (idStart.test(cp)) {
        i += cp.length;
        while (i < source.length) {
          const next = String.fromCodePoint(source.codePointAt(i)!);
          if (!idContinue.test(next)) break;
          i += next.length;
        }
        result.push({ kind: 'identifier', value: source.slice(start, i), start, end: i });
      } else if (ch === '/' && source[i - 1] !== '<' && isRegexStart(result.filter(x => x.kind !== 'trivia').at(-1))) {
        i = scanRegex(source, i);
        result.push({ kind: 'literal', value: source.slice(start, i), start, end: i });
      } else {
        const op = ['===', '!==', '>>>', '**=', '...', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '+=', '-=', '*=', '/=', '%=', '++', '--', '**', '<<', '>>'].find(x => source.startsWith(x, i));
        i += op?.length ?? cp.length;
        result.push({ kind: 'punctuation', value: source.slice(start, i), start, end: i });
      }
    }
  }
  return markJsx(result);
}

function markJsx(tokens: Lexeme[]): Lexeme[] {
  type Mode = 'code' | 'tag' | 'children';
  const elements: Array<{ parent: Mode; closing: boolean }> = [];
  const expressions: Array<{ parent: 'tag' | 'children'; depth: number }> = [];
  let mode: Mode = 'code';
  let closingTag = false;
  let selfClosing = false;
  let tagTypeDepth = 0;
  const next = (index: number): Lexeme | undefined => {
    for (let i = index + 1; i < tokens.length; i++) if (tokens[i]!.kind !== 'trivia') return tokens[i];
    return undefined;
  };
  const previous = (index: number): Lexeme | undefined => {
    for (let i = index - 1; i >= 0; i--) if (tokens[i]!.kind !== 'trivia') return tokens[i];
    return undefined;
  };
  const canStartJsx = (index: number): boolean => {
    const following = next(index);
    const before = previous(index);
    const followedByTag = following?.kind === 'identifier' || following?.value === '>';
    const expressionPosition = !before || ['=', 'przypisz', 'return', 'zwróć', '=>', '(', '{', '[', ',', ':', '?', '&&', '||', 'i', 'lub', '??', 'default', 'domyślny_eksport'].includes(before.value);
    return Boolean(followedByTag && expressionPosition);
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const before = previous(i);
    const after = next(i);
    if (mode === 'code' && token.value === '<' && canStartJsx(i)) {
      elements.push({ parent: 'code', closing: false });
      mode = 'tag'; closingTag = false; selfClosing = false; tagTypeDepth = 0;
      continue;
    }
    if (mode === 'children' && token.value === '<') {
      if (after?.value === '/') {
        mode = 'tag'; closingTag = true; selfClosing = false; tagTypeDepth = 0;
      } else {
        elements.push({ parent: 'children', closing: false });
        mode = 'tag'; closingTag = false; selfClosing = false; tagTypeDepth = 0;
      }
      continue;
    }
    if (mode === 'tag') {
      if (token.value === '{') {
        expressions.push({ parent: 'tag', depth: 1 }); mode = 'code'; continue;
      }
      if (token.value === '<') { tagTypeDepth++; continue; }
      if (token.value === '>' && tagTypeDepth > 0) { tagTypeDepth--; continue; }
      if (token.value === '/' && after?.value === '>') selfClosing = true;
      if (token.value === '>') {
        const element = elements.at(-1);
        if (closingTag || selfClosing) {
          elements.pop();
          mode = element?.parent ?? 'code';
        } else mode = 'children';
        closingTag = false; selfClosing = false;
        continue;
      }
      if (token.kind === 'identifier') token.kind = 'jsx';
      continue;
    }
    if (mode === 'children') {
      if (token.value === '{') {
        expressions.push({ parent: 'children', depth: 1 }); mode = 'code'; continue;
      }
      token.kind = 'jsx';
      continue;
    }
    const expression = expressions.at(-1);
    if (expression) {
      if (token.value === '{') expression.depth++;
      else if (token.value === '}') {
        expression.depth--;
        if (expression.depth === 0) {
          expressions.pop(); mode = expression.parent;
        }
      }
    }
  }
  return tokens;
}
