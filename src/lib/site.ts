/**
 * Central site identity. Change the name, URL, or tagline here once and
 * every page, meta tag, and footer picks it up.
 */
export const SITE = {
  name: 'Ember & Ink',
  shortName: 'Ember & Ink',
  url: 'https://emberandink.com',
  tagline: 'Warm reviews for self-help & fantasy romance readers.',
  description:
    'Ember & Ink is a warm, literary book blog for self-help and fantasy romance readers — honest reviews, thoughtful essays, and curated reading lists.',
  locale: 'en_US',
  ogImage: '/og-default.svg',
  email: 'hello@emberandink.com',
  amazonDisclosure:
    'As an Amazon Associate, Ember & Ink earns from qualifying purchases. Links marked with the Amazon logo support the site at no extra cost to you.',
} as const;

/**
 * Primary navigation.
 * `highlight: true` renders the item as an accent chip in the header
 * (used for the two flagship shelves: Self-Help and Fantasy Romance).
 */
export const NAV: ReadonlyArray<{
  label: string;
  href: string;
  highlight?: boolean;
}> = [
  { label: 'Self-Help', href: '/categories/self-help/', highlight: true },
  { label: 'Fantasy Romance', href: '/categories/fantasy-romance/', highlight: true },
  { label: 'Reviews', href: '/reviews/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'About', href: '/about/' },
];
