
export interface TransformContext {
  source: string;
}

export type Visitor = Record<string, unknown>;

export function createTransformer(): Record<string, unknown> {
  return {
    name: 'polish-typescript-transformer',
    visitor: {},
  };
}
