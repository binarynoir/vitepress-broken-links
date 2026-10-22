# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-10-22

### Changed

- README: replace the plugin list with a generated More from BinaryNoir section, and use a BinaryNoir logo that shows on light and dark backgrounds

## [0.1.3] - 2026-10-15

### Changed

- README: add Sidebar Accordion to the list of BinaryNoir plugins

## [0.1.2] - 2026-10-14

### Changed

- README: add a Documentation and live demo link, and a More from BinaryNoir section listing the other plugins and tools, with links to binarynoir.tech

## [0.1.1] - 2026-10-13

### Fixed

- Each broken link is logged once per version of a page, instead of once for every time VitePress renders it (three times per `vitepress build`). A page whose source changes, as in `vitepress dev`, is warned about again

## [0.1.0] - 2026-10-13

### Added

- `markdownBrokenLinks` markdown-it plugin: links VitePress would report as dead are rendered as a `<span class="broken-link-hint">` around the link text instead of failing the build, using VitePress's own page list, `rewrites`, `public/` HTML files and `ignoreDeadLinks`
- `hints` option (default `true`): each broken link carries an explanation, file and line
- `warn` option (default `true`): a warning per broken link through VitePress's logger
- `brokenLinks` frontmatter: `false` hands a page back to VitePress's check, an object overrides options
- `withBrokenLinks()` config wrapper from `@binarynoir/vitepress-broken-links/vitepress`
- `enableBrokenLinkHints()` from `@binarynoir/vitepress-broken-links/client`: wavy underline and a popover on hover, click or tap
