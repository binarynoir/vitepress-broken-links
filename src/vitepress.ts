import type { UserConfig } from 'vitepress';
import type { MarkdownIt } from 'markdown-it';
import { markdownBrokenLinks } from './plugin.js';
import type { BrokenLinksOptions } from './types.js';

/**
 * Wraps a VitePress config with broken-link handling, the same way
 * `withHtmlEscape` from `vitepress-html-escape` does for escaping.
 *
 * ```ts
 * // .vitepress/config.mts
 * import { defineConfig } from 'vitepress';
 * import { withBrokenLinks } from '@binarynoir/vitepress-broken-links/vitepress';
 *
 * export default withBrokenLinks(defineConfig({ /* ...your config... *\/ }));
 * ```
 *
 * An existing `markdown.config` is not replaced: this wrapper runs first, then
 * calls yours with the same arguments, so it composes with other `withX()`
 * wrappers in any order.
 */
export function withBrokenLinks(config: UserConfig, options: BrokenLinksOptions = {}): UserConfig {
  config.markdown ??= {};
  const existingMarkdownConfig = config.markdown.config ?? (() => {});
  config.markdown.config = (md) => {
    // VitePress 2 types this callback against `markdown-it-async`'s MarkdownIt,
    // a structural superset of plain markdown-it's; the cast bridges the two.
    markdownBrokenLinks(md as unknown as MarkdownIt, options);
    existingMarkdownConfig(md);
  };
  return config;
}
