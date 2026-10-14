import type { MarkdownIt } from 'markdown-it';
import { findDeadLink, getSiteConfig } from './deadLinks.js';
import { HINT_CLOSE_TAG, deadLinkMessage, hintOpenTag } from './hints.js';
import { resolveSettings } from './settings.js';
import { lineOffset, recordSource } from './source.js';
import type { BrokenLinksOptions } from './types.js';

type RenderRule = NonNullable<MarkdownIt['renderer']['rules']['link_open']>;

// Whether each open link in a render was replaced, so its link_close matches.
const openLinks = new WeakMap<object, boolean[]>();

/**
 * A markdown-it plugin for VitePress that renders dead links as text, with
 * a hint explaining what is wrong, instead of letting them fail the build.
 *
 * ```ts
 * // .vitepress/config.mts
 * markdown: {
 *   config(md) {
 *     md.use(markdownBrokenLinks);
 *   },
 * },
 * ```
 *
 * VitePress records every internal link in `env.links` as its `link_open`
 * renderer runs, then reports any that match no page and stops the build.
 * This plugin wraps that renderer: each link VitePress records is checked
 * the same way, right away, and a dead one is taken back out of
 * `env.links` and rendered as a `<span class="broken-link-hint">` around
 * the link text. Links VitePress accepts, external links, and links
 * matched by `ignoreDeadLinks` are left alone.
 *
 * It reads the page list from the running VitePress process, so outside
 * VitePress it does nothing. A page can turn it off with
 * `brokenLinks: false` in its frontmatter.
 */
export function markdownBrokenLinks(md: MarkdownIt, options: BrokenLinksOptions = {}): void {
  recordSource(md);
  const fallback: RenderRule = (tokens, index, renderOptions, _env, renderer) =>
    renderer.renderToken(tokens, index, renderOptions);
  const renderOpen = md.renderer.rules.link_open ?? fallback;
  const renderClose = md.renderer.rules.link_close ?? fallback;

  md.renderer.rules.link_open = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index];
    const href = String(token.attrGet('href') ?? '');
    const before = Array.isArray(env?.links) ? env.links.length : 0;
    const html = renderOpen(tokens, index, renderOptions, env, renderer);

    if (typeof env !== 'object' || env === null) return html;
    const stack = openLinks.get(env) ?? [];
    openLinks.set(env, stack);

    const site = getSiteConfig();
    const settings = resolveSettings(env.frontmatter, options);
    const links: unknown = env.links;
    if (!site || !settings.enabled || !Array.isArray(links) || links.length <= before) {
      stack.push(false);
      return html;
    }

    const file = typeof env.path === 'string' ? env.path : '';
    const fileOrig = typeof env.realPath === 'string' ? env.realPath : file;
    const dead = findDeadLink(String(links[links.length - 1]), file, fileOrig, site);
    if (!dead) {
      stack.push(false);
      return html;
    }

    // Take it back out of the list VitePress checks, along with its line.
    links.pop();
    if (Array.isArray(env.linkLines) && env.linkLines.length > links.length) env.linkLines.length = links.length;

    const vpLine = token.meta?.vpLine;
    const location = {
      line: typeof vpLine === 'number' ? vpLine + lineOffset(env) : undefined,
      file: typeof env.relativePath === 'string' ? env.relativePath : undefined,
    };
    if (settings.warn) {
      const where = [location.file, location.line].filter((part) => part !== undefined).join(':');
      const warn = site.logger ? site.logger.warn.bind(site.logger) : console.warn;
      warn(`(!) Broken link ${href}${where ? ` in ${where}` : ''} is shown as text instead of a link.`);
    }
    stack.push(true);
    return hintOpenTag(settings.hints ? deadLinkMessage(dead, href) : undefined, location);
  };

  md.renderer.rules.link_close = (tokens, index, renderOptions, env, renderer) => {
    const replaced = typeof env === 'object' && env !== null ? openLinks.get(env)?.pop() : false;
    return replaced ? HINT_CLOSE_TAG : renderClose(tokens, index, renderOptions, env, renderer);
  };
}
