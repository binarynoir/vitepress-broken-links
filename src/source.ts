import type { MarkdownIt } from 'markdown-it';

// The full source handed to `md.parse` for each render, keyed by its env.
const sources = new WeakMap<object, string>();

/**
 * Records the source each render starts from. VitePress strips the
 * frontmatter in its own `md.parse` wrapper before parsing, so token line
 * maps count from the end of the frontmatter. This wrapper is installed
 * later, from `markdown.config`, so it runs first and sees the whole file.
 */
export function recordSource(md: MarkdownIt): void {
  const parse = md.parse.bind(md);
  md.parse = (src, env) => {
    if (typeof env === 'object' && env !== null) sources.set(env, src);
    return parse(src, env);
  };
}

/** The full source of the page being rendered with `env`, if recorded. */
export const sourceOf = (env: object): string | undefined => sources.get(env);

/**
 * How many lines of the source file come before line 1 of the parsed
 * content: the frontmatter VitePress stripped (`env.content` is what it
 * parsed).
 */
export function lineOffset(env: object): number {
  const source = sources.get(env);
  const { content } = env as { content?: unknown };
  if (source === undefined || typeof content !== 'string' || !source.endsWith(content)) return 0;
  return source.slice(0, source.length - content.length).split('\n').length - 1;
}
