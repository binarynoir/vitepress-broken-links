import type { DeadLink } from './deadLinks.js';

/** Class on the element a broken link is rendered as. */
export const HINT_CLASS = 'broken-link-hint';

/** Where a hint points in the source: a 1-based line, and the file under VitePress. */
export interface HintLocation {
  line?: number;
  file?: string;
}

/** Escapes text for HTML content and double-quoted attribute values. */
export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The opening tag a broken link is rendered with in place of its `<a>`. With
 * `message`, it carries the explanation the client script
 * (`enableBrokenLinkHints`) underlines and shows in a popover; without it,
 * the link text is shown plainly.
 */
export function hintOpenTag(message: string | undefined, location: HintLocation): string {
  if (message === undefined) return `<span class="${HINT_CLASS}">`;
  const attributes = [
    `class="${HINT_CLASS}"`,
    `data-broken-link-hint="${escapeHtml(message)}"`,
    location.line === undefined ? '' : `data-broken-link-hint-line="${location.line}"`,
    location.file === undefined ? '' : `data-broken-link-hint-file="${escapeHtml(location.file)}"`,
  ].filter(Boolean);
  return `<span ${attributes.join(' ')}>`;
}

export const HINT_CLOSE_TAG = '</span>';

/** Explains why a link was disabled and how to fix it. */
export function deadLinkMessage(link: DeadLink, href: string): string {
  if (link.localhost) {
    return `\`${href}\` points at \`localhost\`, which only works on your own machine, so it is shown as text instead of a link. Link to the live URL, or set \`ignoreDeadLinks: 'localhostLinks'\` to keep links like this.`;
  }
  const where =
    link.resolved === undefined
      ? 'does not match any page on this site'
      : `looks for \`${link.resolved}.md\`, which does not exist`;
  return `\`${href}\` ${where}, so it is shown as text instead of a link. Point it at an existing page, add the page, or use a full URL (\`https://…\`) if it leads off the site.`;
}
