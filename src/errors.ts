export interface SourceLocation {
  line: number;
  column: number;
}

export type TranspileErrorKind = 'parse' | 'transform';

/** A user-facing failure while parsing or transforming PolishTS source. */
export class TranspileError extends Error {
  readonly kind: TranspileErrorKind;
  readonly location?: SourceLocation;
  override readonly cause?: unknown;

  constructor(message: string, options: { kind: TranspileErrorKind; location?: SourceLocation; cause?: unknown }) {
    super(message);
    this.name = 'TranspileError';
    this.kind = options.kind;
    if (options.location) this.location = options.location;
    if ('cause' in options) this.cause = options.cause;
  }
}
