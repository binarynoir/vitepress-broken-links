import { defineConfig } from 'vitepress';
import { markdownHtmlEscape } from '@binarynoir/vitepress-html-escape';
import { markdownBrokenLinks } from '../../../../src/index.js';

// A small site whose pages link to pages that don't exist. Without the
// plugin, `vitepress build` stops with "dead link(s) found".
export default defineConfig({
  title: 'broken-links fixture',
  cleanUrls: true,
  ignoreDeadLinks: ['/ignored'],
  markdown: {
    config(md) {
      md.use(markdownBrokenLinks);
      md.use(markdownHtmlEscape);
    },
  },
});
