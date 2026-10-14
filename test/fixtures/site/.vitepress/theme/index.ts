import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { enableBrokenLinkHints } from '../../../../../src/client.js';

export default {
  extends: DefaultTheme,
  enhanceApp() {
    enableBrokenLinkHints();
  },
} satisfies Theme;
