# vitepress-broken-links

[![npm version](https://img.shields.io/npm/v/@binarynoir/vitepress-broken-links.svg)](https://www.npmjs.com/package/@binarynoir/vitepress-broken-links)
[![CI](https://github.com/binarynoir/vitepress-broken-links/actions/workflows/ci.yml/badge.svg)](https://github.com/binarynoir/vitepress-broken-links/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@binarynoir/vitepress-broken-links.svg)](LICENSE)

A [VitePress 2](https://vitepress.dev) plugin that keeps a dead link from failing
your build. A link to a page that doesn't exist is shown as text, with a wavy
underline and a popover that explains what is wrong and where. Links that work
are left exactly as they are.

It's built for docs sites with many contributors, where one mistyped link
shouldn't take the whole site down.

[![Support me on Buy Me a Coffee](https://img.shields.io/badge/Support%20me-Buy%20Me%20a%20Coffee-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/binarynoir)
[![Support me on Ko-fi](https://img.shields.io/badge/Support%20me-Ko--fi-blue?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/binarynoir)
[![More tools](https://img.shields.io/badge/Website-binarynoir.tech-8c8c8c?style=for-the-badge)](https://binarynoir.tech)

## The problem

VitePress checks every internal link against your pages. One that matches no
page, like this:

```md
Open an issue on the [site repository](/binarynoir.github.io).
```

stops the whole build:

```txt
(!) Found dead link /binarynoir.github.io in file legal.md:35
Error: 1 dead link(s) found.
```

Your only built-in choices are to fix it before you can ship, or to turn the
check off with `ignoreDeadLinks`, which then lets broken links through as
working-looking anchors that lead to a 404 (see
[Why not `ignoreDeadLinks`?](#why-not-ignoredeadlinks)).

## What this does

The same link renders as:

```html
<span
  class="broken-link-hint"
  data-broken-link-hint="`/binarynoir.github.io` looks for
  `binarynoir.github.io.md`, which does not exist, so it is shown as text instead of a
  link. Point it at an existing page, add the page, or use a full URL (`https://…`) if
  it leads off the site."
  data-broken-link-hint-line="35"
  data-broken-link-hint-file="legal.md"
  >site repository</span
>
```

and the build log still tells you about it:

```txt
(!) Broken link /binarynoir.github.io in legal.md:35 is shown as text instead of a link.
```

With the client script, the text gets a wavy underline and a popover with the
file, line and message on hover, click or tap, the same way
[HTML Escape](https://github.com/binarynoir/vitepress-html-escape) hints work.

A link counts as dead exactly when VitePress would call it dead: the plugin
uses the page list, `rewrites`, `public/` HTML files and `ignoreDeadLinks`
from your running VitePress config. External links, anchors on the same page,
and links to files such as `.pdf` or `.zip` are never touched.

## Why not `ignoreDeadLinks`?

VitePress's built-in
[`ignoreDeadLinks`](https://vitepress.dev/reference/site-config#ignoredeadlinks)
option also stops dead links from failing the build, but it does that by
skipping the check, not by handling the link:

- **Readers still get a 404.** An ignored link is published as a normal
  `<a href>`. It looks like it works until someone clicks it. This plugin
  removes the anchor, so a broken link can't send anyone to a missing page,
  and the popover tells them why.
- **Authors aren't told.** `ignoreDeadLinks: true` turns the check off for
  the whole site, so a dead link no longer appears anywhere in the build
  output. This plugin still logs each one with its file and line, and marks
  it on the page, so it can be found and fixed later.
- **You'd have to know the links in advance.** The string, RegExp and
  function forms only skip links you've already described. That works for
  known exceptions, such as a page that's generated after the build, but not
  for a typo someone adds next week. This plugin covers any dead link,
  including ones nobody has written yet.
- **It's all or nothing per site.** With this plugin, a page that must never
  ship a dead link can opt out with `brokenLinks: false` in its frontmatter,
  and VitePress's check applies to that page again.

The two work together. Links matched by `ignoreDeadLinks` are left as links,
just as VitePress leaves them, so use it for the exceptions you mean to keep,
and let this plugin handle the mistakes.

**When to keep the built-in check:** if you want a dead link to block a
release, for example as a CI gate on pull requests, don't add this plugin to
that build. Or set `brokenLinks: false` on the pages that matter most.

## Install

```sh
npm install -D @binarynoir/vitepress-broken-links
```

## Usage

```ts
// .vitepress/config.mts
import { defineConfig } from 'vitepress';
import { markdownBrokenLinks } from '@binarynoir/vitepress-broken-links';

export default defineConfig({
  markdown: {
    config(md) {
      md.use(markdownBrokenLinks);
    },
  },
});
```

Or wrap the whole config:

```ts
import { withBrokenLinks } from '@binarynoir/vitepress-broken-links/vitepress';

export default withBrokenLinks(defineConfig({/* ... */}));
```

Then turn on the underline and popover in your theme:

```ts
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme';
import { enableBrokenLinkHints } from '@binarynoir/vitepress-broken-links/client';

export default {
  extends: DefaultTheme,
  enhanceApp() {
    enableBrokenLinkHints();
  },
};
```

`enableBrokenLinkHints` takes the same options as HTML Escape's client:
`hover` (default `true`), `hoverDelay` in milliseconds (default `300`) and
`injectStyles` (default `true`). Colors follow the VitePress theme and can be
overridden with `--broken-link-hint-error`, `--broken-link-hint-popover-bg`,
`--broken-link-hint-popover-fg` and `--broken-link-hint-popover-border`.

## Options

| Option  | Default | What it does                                                                               |
| ------- | ------- | ------------------------------------------------------------------------------------------ |
| `hints` | `true`  | Attach the explanation, file and line to each broken link. `false` shows the text plainly. |
| `warn`  | `true`  | Log a warning for each broken link while rendering, through VitePress's logger.            |

### Per page

A page can tune or turn off the plugin in its frontmatter:

```yaml
---
brokenLinks:
  hints: false
---
```

`brokenLinks: false` hands the page back to VitePress, so its dead links fail
the build again. Use it on pages where a dead link must never ship.

## How it works

VitePress records each internal link in `env.links` as its `link_open`
renderer runs, then fails the build at `renderStart` if any match no page. This
plugin wraps that renderer: each link VitePress records is checked on the spot
with the same rules, and a dead one is taken back out of `env.links` and
rendered as a `<span>` around the link text. VitePress's check then has nothing
left to fail on.

The page list comes from `globalThis.VITEPRESS_CONFIG`, which VitePress sets
while it runs and keeps current as pages are added. Under plain markdown-it the
plugin does nothing.

## Limits

- Only Markdown links (`[text](url)`) are checked. VitePress doesn't check raw
  `<a href>` HTML either.
- Links to a missing heading on an existing page (`./page#nope`) are not
  dead to VitePress, so they are left as links.

## Releasing

Releases are tag-triggered. From a clean `main` that's in sync with
`origin/main`:

```sh
npm run release:patch   # or release:minor / release:major
```

This runs typecheck/lint/test/build locally, then `npm version <bump>` and
`git push --follow-tags`. Pushing the tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which re-runs
the checks, publishes to npm, and creates a GitHub release.

## License

MIT

---

## Feedback and support

Bug reports, feature requests and questions are all welcome. Please open them on this project's [GitHub issue tracker](https://github.com/binarynoir/vitepress-broken-links/issues):

- **Found a bug?** [Report it](https://github.com/binarynoir/vitepress-broken-links/issues/new?labels=bug&title=Bug%3A%20). Include your version and the steps to reproduce it.
- **Have an idea?** [Request a feature](https://github.com/binarynoir/vitepress-broken-links/issues/new?labels=enhancement&title=Feature%20request%3A%20). Tell us what you are trying to do.
- **Something else?** [Browse open issues](https://github.com/binarynoir/vitepress-broken-links/issues) to see if it has already been raised.

Pull requests are welcome too.
