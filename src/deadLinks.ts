import fs from 'node:fs';
import path from 'node:path';

type IgnoreDeadLink = string | RegExp | ((url: string, file: string) => boolean);

/**
 * The parts of VitePress's resolved site config the dead-link check reads.
 * VitePress publishes the whole config as `globalThis.VITEPRESS_CONFIG` while
 * it runs, and keeps `pages` and `rewrites` current as files are added.
 */
export interface SiteConfigLike {
  srcDir: string;
  /** Every page, relative to `srcDir`, with its `.md` extension. */
  pages: string[];
  rewrites?: { map: Record<string, string>; inv: Record<string, string> };
  publicDir?: string;
  ignoreDeadLinks?: boolean | 'localhostLinks' | IgnoreDeadLink[];
  logger?: { warn(message: string): void };
}

/** The site config of the running VitePress process, if there is one. */
export function getSiteConfig(): SiteConfigLike | undefined {
  const config = (globalThis as { VITEPRESS_CONFIG?: unknown }).VITEPRESS_CONFIG;
  if (typeof config !== 'object' || config === null) return undefined;
  const { srcDir, pages } = config as Partial<SiteConfigLike>;
  return typeof srcDir === 'string' && Array.isArray(pages) ? (config as SiteConfigLike) : undefined;
}

export const EXTERNAL_URL_RE = /^(?:[a-z]+:|\/\/)/i;

// VitePress's list of extensions that are never pages (`treatAsHtml`).
const KNOWN_EXTENSIONS = new Set(
  (
    '3g2,3gp,aac,ai,apng,au,avif,bin,bmp,cer,class,conf,crl,css,csv,dll,doc,eps,epub,exe,gif,gz,ics,ief,jar,jpe,jpeg,jpg,js,json,jsonld,m4a,man,mid,midi,mjs,mov,mp2,mp3,mp4,mpe,mpeg,mpg,mpp,oga,ogg,ogv,ogx,opus,otf,p10,p7c,p7m,p7s,pdf,png,ps,qt,roff,rtf,rtx,ser,svg,t,tif,tiff,tr,ts,tsv,ttf,txt,vtt,wav,weba,webm,webp,woff,woff2,xhtml,xml,yaml,yml,zip' +
    (process.env.VITE_EXTRA_EXTENSIONS ? `,${process.env.VITE_EXTRA_EXTENSIONS}` : '')
  ).split(','),
);

const treatAsHtml = (pathname: string): boolean => {
  const extension = pathname.split('.').pop();
  return extension === undefined || !KNOWN_EXTENSIONS.has(extension.toLowerCase());
};

const slash = (value: string): string => value.replace(/\\/g, '/');

/** Why a link is dead: where it was looked for, or that it points at localhost. */
export interface DeadLink {
  url: string;
  /** The page it was resolved to, relative to `srcDir`, without `.md`. */
  resolved?: string;
  localhost: boolean;
}

/**
 * Whether VitePress would report `url` as a dead link, using the same steps
 * as its own check. `url` is the link as VitePress recorded it in
 * `env.links`, `file` is the page being rendered (after rewrites) and
 * `fileOrig` the source file VitePress passes to an `ignoreDeadLinks`
 * function.
 */
export function findDeadLink(url: string, file: string, fileOrig: string, site: SiteConfigLike): DeadLink | undefined {
  const { ignoreDeadLinks } = site;
  if (ignoreDeadLinks === true) return undefined;

  let pathname: string;
  try {
    pathname = new URL(url, 'http://a.com').pathname;
  } catch {
    return undefined;
  }
  if (!treatAsHtml(pathname)) return undefined;

  const isIgnored = (cleaned: string): boolean => {
    if (ignoreDeadLinks === 'localhostLinks') return cleaned.replace(EXTERNAL_URL_RE, '').startsWith('//localhost');
    if (!Array.isArray(ignoreDeadLinks)) return false;
    return ignoreDeadLinks.some((ignore) =>
      typeof ignore === 'string'
        ? cleaned === ignore
        : ignore instanceof RegExp
          ? ignore.test(cleaned)
          : typeof ignore === 'function' && ignore(cleaned, fileOrig),
    );
  };

  let cleaned = url.replace(/[?#].*$/, '').replace(/\.(html|md)$/, '');
  if (cleaned.endsWith('/')) cleaned += 'index';
  const localhost = EXTERNAL_URL_RE.test(cleaned);

  let resolved: string;
  try {
    resolved = decodeURIComponent(
      slash(
        cleaned.startsWith('/')
          ? cleaned.slice(1)
          : path.relative(site.srcDir, path.resolve(path.dirname(file), cleaned)),
      ),
    );
  } catch {
    return isIgnored(cleaned) ? undefined : { url, localhost };
  }

  const rewriteSource = site.rewrites?.inv[`${resolved}.md`];
  if (rewriteSource) resolved = rewriteSource.slice(0, -3);
  const rewritten = rewriteSource ? undefined : site.rewrites?.map[`${resolved}.md`];

  const isPage = site.pages.some((page) => slash(page.replace(/\.md$/, '')) === resolved);
  if (isPage && (rewritten == null || rewritten === `${resolved}.md`)) return undefined;
  if (site.publicDir && fs.existsSync(path.join(site.publicDir, `${resolved}.html`))) return undefined;
  if (isIgnored(cleaned)) return undefined;
  return localhost ? { url, localhost } : { url, resolved, localhost };
}
