import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findDeadLink } from '../src/index.js';
import type { SiteConfigLike } from '../src/index.js';

const srcDir = path.resolve('/site');
const file = path.join(srcDir, 'guide/index.md');
const site = (overrides: Partial<SiteConfigLike> = {}): SiteConfigLike => ({
  srcDir,
  pages: ['index.md', 'guide/index.md', 'guide/api.md', 'old/page.md'],
  rewrites: { map: { 'old/page.md': 'new/page.md' }, inv: { 'new/page.md': 'old/page.md' } },
  ...overrides,
});

describe('findDeadLink', () => {
  it('finds pages by absolute and relative links, with or without an index', () => {
    for (const url of ['/', '/guide/', '/guide/api', './api', '../index', './api#section', './api?x=1']) {
      expect(findDeadLink(url, file, file, site())).toBeUndefined();
    }
  });

  it('reports where a dead link was looked for', () => {
    expect(findDeadLink('/nope', file, file, site())).toEqual({ url: '/nope', resolved: 'nope', localhost: false });
    expect(findDeadLink('./sub/', file, file, site())?.resolved).toBe('guide/sub/index');
  });

  it('follows rewrites, and treats the pre-rewrite path as dead', () => {
    expect(findDeadLink('/new/page', file, file, site())).toBeUndefined();
    expect(findDeadLink('/old/page', file, file, site())).toBeDefined();
  });

  it('honors every form of ignoreDeadLinks', () => {
    expect(findDeadLink('/nope', file, file, site({ ignoreDeadLinks: true }))).toBeUndefined();
    expect(findDeadLink('/nope', file, file, site({ ignoreDeadLinks: ['/nope'] }))).toBeUndefined();
    expect(findDeadLink('/nope', file, file, site({ ignoreDeadLinks: [/^\/no/] }))).toBeUndefined();
    expect(findDeadLink('/nope', file, file, site({ ignoreDeadLinks: [(url) => url === '/nope'] }))).toBeUndefined();
    const localhost = 'http://localhost:5173/guide/';
    expect(findDeadLink(localhost, file, file, site())).toEqual({ url: localhost, localhost: true });
    expect(findDeadLink(localhost, file, file, site({ ignoreDeadLinks: 'localhostLinks' }))).toBeUndefined();
  });

  it('skips links to files that are not pages', () => {
    expect(findDeadLink('/files/app.zip', file, file, site())).toBeUndefined();
  });
});
