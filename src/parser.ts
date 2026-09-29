import * as parser from '@babel/parser';
import { DICTIONARY } from './dictionary.js';

interface Token {
  type: 'keyword' | 'verbatim';
  value: string;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    // Single-line comment
    if (source[i] === '/' && source[i + 1] === '/') {
      let end = source.indexOf('\n', i);
      if (end === -1) end = source.length;
      tokens.push({ type: 'verbatim', value: source.slice(i, end) });
      i = end;
      continue;
    }

    // Multi-line comment
    if (source[i] === '/' && source[i + 1] === '*') {
      let end = source.indexOf('*/', i + 2);
      if (end === -1) end = source.length; else end += 2;
      tokens.push({ type: 'verbatim', value: source.slice(i, end) });
      i = end;
      continue;
    }

    // Single-quoted string
    if (source[i] === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== "'") {
        if (source[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'verbatim', value: source.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Double-quoted string
    if (source[i] === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"') {
        if (source[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'verbatim', value: source.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_żźćńółęąśŻŹĆĄŚÓŁĘŃ]/.test(source[i]!)) {
      let j = i;
      while (j < source.length && /[a-zA-Z0-9_żźćńółęąśŻŹĆĄŚÓŁĘŃ]/.test(source[j]!)) {
        j++;
      }
      const word = source.slice(i, j);
      tokens.push({ type: 'keyword', value: word });
      i = j;
      continue;
    }

    // Everything else (whitespace, punctuation, numbers, etc.)
    tokens.push({ type: 'verbatim', value: source[i]! });
    i++;
  }

  return tokens;
}

function polishWord(word: string): string {
  return word
    .replace(/ą/g, '[aą]')
    .replace(/ć/g, '[cć]')
    .replace(/ę/g, '[eę]')
    .replace(/ł/g, '[lł]')
    .replace(/ń/g, '[nń]')
    .replace(/ó/g, '[oó]')
    .replace(/ś/g, '[sś]')
    .replace(/ź/g, '[zź]')
    .replace(/ż/g, '[zż]');
}

const sortedKeys = Object.keys(DICTIONARY)
  .filter(k => k === 'i' || !/^[a-z]$/.test(k))
  .sort((a, b) => b.length - a.length);

const escapedKeys = sortedKeys.map(polishWord);
const keywordPattern = new RegExp(`^(${escapedKeys.join('|')})$`, 'u');

function transform(tokens: Token[]): Token[] {
  return tokens.map(token => {
    if (token.type === 'verbatim') return token;
    const match = token.value.match(keywordPattern);
    if (!match) return token;
    const original = Object.keys(DICTIONARY).find(k => new RegExp(`^${polishWord(k)}$`, 'u').test(token.value));
    if (!original) return token;
    return { type: 'keyword', value: DICTIONARY[original]! };
  });
}

export function parse(source: string) {
  const tokens = tokenize(source);
  const transformed = transform(tokens);
  const normalized = transformed.map(t => t.value).join('');
  
  return parser.parse(normalized, {
    sourceType: 'module',
    plugins: ['typescript', 'decorators-legacy'],
  });
}
