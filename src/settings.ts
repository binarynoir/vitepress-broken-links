import { FRONTMATTER_KEY } from './constants.js';
import type { BrokenLinksOptions } from './types.js';

export interface ResolvedSettings {
  enabled: boolean;
  hints: boolean;
  warn: boolean;
}

/**
 * Combines the plugin options with a page's `brokenLinks` frontmatter. The
 * page wins: `brokenLinks: false` turns the plugin off, and an object
 * overrides only the keys it sets. Anything else is ignored.
 */
export function resolveSettings(frontmatter: unknown, options: BrokenLinksOptions = {}): ResolvedSettings {
  const pageValue = isRecord(frontmatter) ? frontmatter[FRONTMATTER_KEY] : undefined;
  if (pageValue === false) return { enabled: false, hints: false, warn: false };

  const page = isRecord(pageValue) ? pageValue : {};
  return {
    enabled: true,
    hints: toBoolean(page.hints) ?? options.hints ?? true,
    warn: toBoolean(page.warn) ?? options.warn ?? true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
