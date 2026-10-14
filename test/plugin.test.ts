import path from 'node:path';
import type { MarkdownIt } from 'markdown-it';
import { createMarkdownRenderer } from 'vitepress';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markdownBrokenLinks } from '../src/index.js';
import type { BrokenLinksOptions } from '../src/index.js';

const srcDir = path.resolve('/site');
const warn = vi.fn();
// VitePress keeps one renderer per process, so every test shares this
// object, which the plugin reads on each render.
const options: BrokenLinksOptions = {};

beforeEach(() => {
  (globalThis as { VITEPRESS_CONFIG?: unknown }).VITEPRESS_CONFIG = {
    srcDir,
    pages: ['index.md', 'guide/index.md', 'guide/api.md'],
    rewrites: { map: {}, inv: {} },
    logger: { warn },
  };
});

afterEach(() => {
  delete (globalThis as { VITEPRESS_CONFIG?: unknown }).VITEPRESS_CONFIG;
  warn.mockReset();
  for (const key of Object.keys(options)) delete options[key as keyof BrokenLinksOptions];
});

async function render(source: string, pageOptions: BrokenLinksOptions = {}, relativePath = 'guide/index.md') {
  Object.assign(options, pageOptions);
  const md = await createMarkdownRenderer(srcDir, {
    config: (renderer) => markdownBrokenLinks(renderer as unknown as MarkdownIt, options),
  });
  const env: Record<string, unknown> = { path: path.join(srcDir, relativePath), relativePath, cleanUrls: true };
  const html = await md.renderAsync(source, env);
  return { html, env };
}

describe('markdownBrokenLinks', () => {
  it('keeps links to existing pages, both relative and absolute', async () => {
    const { html, env } = await render('[api](./api.md) [home](/) [guide](/guide/)');
    expect(html).toContain('<a href="./api">api</a>');
    expect(html).toContain('<a href="/">home</a>');
    expect(html).not.toContain('broken-link-hint');
    expect(env.links).toEqual(['./api', '/', '/guide/']);
  });

  it('replaces a dead link with a hint and takes it out of env.links', async () => {
    const { html, env } = await render('See [the missing page](./missing.md#usage) now.');
    expect(html).toContain(
      '<span class="broken-link-hint" data-broken-link-hint="`./missing.md#usage` looks for `guide/missing.md`, which does not exist',
    );
    expect(html).toMatch(
      /data-broken-link-hint-line="1" data-broken-link-hint-file="guide\/index\.md">the missing page<\/span> now\./,
    );
    expect(env.links).toEqual([]);
    expect(env.linkLines).toEqual([]);
  });

  it('keeps the link lines of the links around a dead one in step', async () => {
    const { env } = await render('[a](./api.md)\n\n[b](/nope)\n\n[c](/)');
    expect(env.links).toEqual(['./api', '/']);
    expect(env.linkLines).toEqual([1, 5]);
  });

  it('counts the line from the top of the file, frontmatter included', async () => {
    const { html } = await render('---\ntitle: T\n---\n\n[x](/nope)');
    expect(html).toContain('data-broken-link-hint-line="5"');
  });

  it('logs a warning with the location', async () => {
    await render('\n[x](/nope)');
    expect(warn).toHaveBeenCalledWith('(!) Broken link /nope in guide/index.md:2 is shown as text instead of a link.');
  });

  it('explains localhost links', async () => {
    const { html } = await render('[dev](http://localhost:5173/guide/)');
    expect(html).toContain('points at `localhost`');
    expect(html).toContain('>dev</span>');
  });

  it('leaves external links and non-page files alone', async () => {
    const { html } = await render('[web](https://example.com/nope) [file](/files/app.zip) [top](#top)');
    expect(html).not.toContain('broken-link-hint');
  });

  it('shows the link text plainly with hints: false', async () => {
    const { html } = await render('[x](/nope)', { hints: false });
    expect(html).toContain('<span class="broken-link-hint">x</span>');
    expect(html).not.toContain('data-broken-link-hint');
  });

  it('does not warn with warn: false', async () => {
    await render('[x](/nope)', { warn: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it('leaves dead links to VitePress on a page with brokenLinks: false', async () => {
    const { html, env } = await render('---\nbrokenLinks: false\n---\n\n[x](/nope)');
    expect(html).toContain('<a href="/nope">x</a>');
    expect(env.links).toEqual(['/nope']);
  });

  it('lets a page override hints in its frontmatter', async () => {
    const { html } = await render('---\nbrokenLinks:\n  hints: false\n---\n\n[x](/nope)');
    expect(html).toContain('<span class="broken-link-hint">x</span>');
  });

  it('does nothing outside a running VitePress process', async () => {
    delete (globalThis as { VITEPRESS_CONFIG?: unknown }).VITEPRESS_CONFIG;
    const { html, env } = await render('[x](/nope)');
    expect(html).toContain('<a href="/nope">x</a>');
    expect(env.links).toEqual(['/nope']);
  });
});
