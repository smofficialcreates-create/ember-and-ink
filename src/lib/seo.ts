import { SITE } from './site';

/**
 * Props shared by every page's <Seo /> call.
 * Kept in sync with `src/components/Seo.astro`.
 */
export interface SeoInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Builds the final <title> using the site's required format:
 *   "Page Title | Ember & Ink"
 *
 * If the caller already included the brand name, it is not doubled up —
 * this makes it safe for editors to type either "About" or
 * "About | Ember & Ink" in a page title.
 */
export function buildTitle(pageTitle: string): string {
  const trimmed = pageTitle.trim();
  if (!trimmed) return SITE.name;
  if (trimmed.toLowerCase().includes(SITE.name.toLowerCase())) return trimmed;
  return `${trimmed} | ${SITE.name}`;
}

/**
 * Turns a relative path (e.g. "/og-default.png" or "images/x.png") into
 * an absolute URL required by Open Graph and Twitter Card metadata.
 * Absolute URLs are returned untouched.
 */
export function absoluteImage(src?: string): string {
  const fallback = `${SITE.url}${SITE.ogImage}`;
  if (!src) return fallback;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE.url}${src.startsWith('/') ? '' : '/'}${src}`;
}