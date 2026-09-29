declare module '@babel/generator' {
  import type { Node } from '@babel/types';

  interface GeneratorOptions {
    comments?: boolean;
    compact?: boolean;
    concise?: boolean;
    retainLines?: boolean;
    retainFunctionParens?: boolean;
    commentsOpts?: Record<string, unknown>;
    jescOption?: Record<string, unknown>;
  }

  interface GeneratorResult {
    code: string;
    map?: string;
  }

  const mod: {
    (node: Node, options?: GeneratorOptions, code?: string): GeneratorResult;
    default: typeof mod;
    generate: typeof mod;
    CodeGenerator: new (...args: unknown[]) => unknown;
  };

  namespace generator {
    export { mod as default, mod as generate };
  }

  export = mod;
}
