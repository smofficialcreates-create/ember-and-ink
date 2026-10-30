import { SITE } from './site';
import { PUBLIC_AMAZON_ASSOCIATE_TAG } from 'astro:env/client';

/**
 * Resolved Amazon Associates tag. Falls back to the value baked into
 * `astro.config.mjs` even if the environment variable is missing, so the
 * site never accidentally ships untagged affiliate links.
 */
const TAG = PUBLIC_AMAZON_ASSOCIATE_TAG || 'shubhstor0de4-21';

/**
 * Adds our associate tag to any Amazon product URL. Non-Amazon URLs are
 * returned unchanged so external links are never rewritten by mistake.
 *
 * Handles every Amazon TLD (amazon.com, amazon.co.uk, amazon.de,
 * amazon.ca, …) — if a future domain appears, the regex covers it.
 */
export function withAmazonTag(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return rawUrl;
    url.searchParams.set('tag', TAG);
    return url.toString();
  } catch {
    // Malformed URL — return as-is; the schema validates `z.string().url()`
    // so this is only reachable if someone bypasses the schema.
    return rawUrl;
  }
}

/** The disclosure string shown near affiliate CTAs across the site. */
export const affiliateDisclosure = SITE.amazonDisclosure;