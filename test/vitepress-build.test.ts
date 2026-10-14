import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vitepress';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Builds test/fixtures/site with the real `vitepress build`. Every page in the
// fixture links to a page that doesn't exist, which fails the build without
// this plugin.
const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/site');
const outDir = mkdtempSync(path.join(tmpdir(), 'vitepress-broken-links-'));

/** The rendered page body, between the h1 and the end of <main>. */
function readPage(page: string): string {
  const html = readFileSync(path.join(outDir, `${page}.html`), 'utf-8');
  return html.slice(html.indexOf('<h1'), html.indexOf('</main>'));
}

beforeAll(async () => {
  await build(siteRoot, { outDir });
}, 120_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(path.join(siteRoot, '.vitepress/cache'), { recursive: true, force: true });
});

describe('vitepress build', () => {
  it('renders dead links as hints and keeps working ones as links', () => {
    const page = readPage('index');
    expect(page).toMatch(/<a href="\.\/guide\/existing"[^>]*>working link<\/a>/);
    expect(page).toMatch(/<a href="https:\/\/example\.com"[^>]*>external one<\/a>/);
    expect(page).toMatch(
      /<span class="broken-link-hint" data-broken-link-hint="`\/missing` looks for `missing\.md`, which does not exist[^"]*" data-broken-link-hint-line="5" data-broken-link-hint-file="index\.md">missing page<\/span>/,
    );
    expect(page).toMatch(
      /data-broken-link-hint="`\.\/guide\/nope\.md` looks for `guide\/nope\.md`[^>]*>relative one<\/span>/,
    );
  });

  it('leaves links matched by ignoreDeadLinks alone', () => {
    expect(readPage('index')).toMatch(/<a href="\/ignored"[^>]*>ignored link<\/a>/);
  });

  it('counts lines from the top of the file, frontmatter included', () => {
    const page = readPage('guide/existing');
    expect(page).toMatch(/<a href="\.\/\.\.\/"[^>]*>the index<\/a>/);
    expect(page).toMatch(/data-broken-link-hint-line="7"[^>]*><strong>bold<\/strong> missing page<\/span>/);
    expect(page).toMatch(
      /data-broken-link-hint="`\/binarynoir\.github\.io` looks for `binarynoir\.github\.io\.md`[^"]*" data-broken-link-hint-line="9" data-broken-link-hint-file="guide\/existing\.md">site repository<\/span>/,
    );
  });
});
