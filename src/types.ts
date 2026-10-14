export interface BrokenLinksOptions {
  /**
   * Explain each broken link: it is rendered as a
   * `<span class="broken-link-hint">` carrying what is wrong and where.
   * Call `enableBrokenLinkHints()` from
   * `@binarynoir/vitepress-broken-links/client` in the browser to underline
   * it and show the explanation on hover, click or tap. With `false`, the
   * link text is shown plainly. Default: `true`.
   */
  hints?: boolean;
  /**
   * Log a warning for each broken link while rendering, in the same place
   * VitePress reports dead links. Default: `true`.
   */
  warn?: boolean;
}

/**
 * What a page can put under `brokenLinks` in its frontmatter: `false` turns
 * the plugin off for that page, so VitePress's own dead-link check applies
 * again, and an object overrides individual options.
 */
export type BrokenLinksFrontmatter = false | BrokenLinksOptions;
