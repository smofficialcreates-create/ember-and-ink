/**
 * The single source of truth for blog categories.
 *
 * Each entry has:
 *   - `slug`         URL-safe form used in `/categories/<slug>/`
 *   - `label`        exact string stored in post frontmatter
 *   - `description`  short blurb used in the category grid and meta tags
 *   - `featured`     highlights the two flagship shelves (Self-Help,
 *                    Fantasy Romance) in the header and home page
 *
 * Add or rename a category here and every page that lists categories
 * picks it up automatically â€” no other file needs to change.
 */
export interface Category {
  slug: string;
  label: string;
  description: string;
  featured?: boolean;
}

export const CATEGORIES: ReadonlyArray<Category> = [
  { slug: 'philosophy', label: 'Philosophy', description: 'Deep thoughts, ancient wisdom, and modern philosophical explorations.' },
  {
    slug: 'self-help',
    label: 'Self-Help',
    description: 'Practical, hopeful guides for habits, focus, and living with intention.',
    featured: true,
  },
  {
    slug: 'fantasy-romance',
    label: 'Fantasy Romance',
    description: 'Sweeping courts, slow-burn chemistry, and worlds that feel like home.',
    featured: true,
  },
  { slug: 'romance', label: 'Romance', description: 'Love stories across every trope and heat level.' },
  { slug: 'fantasy', label: 'Fantasy', description: 'Epic worlds, quiet magic, and everything in between.' },
  { slug: 'mystery-thriller', label: 'Mystery & Thriller', description: 'Whodunits and page-turning suspense.' },
  { slug: 'contemporary-fiction', label: 'Contemporary Fiction', description: 'Modern life, told with craft.' },
  { slug: 'young-adult', label: 'Young Adult', description: 'Coming-of-age stories that stick with you.' },
  { slug: 'historical-fiction', label: 'Historical Fiction', description: 'The past, richly imagined.' },
  { slug: 'science-fiction', label: 'Science Fiction', description: 'Futures, machines, and big ideas.' },
  { slug: 'horror', label: 'Horror', description: 'Quiet dread and things that go bump.' },
  { slug: 'nonfiction', label: 'Nonfiction', description: 'True stories and ideas worth keeping.' },
  { slug: 'poetry-essays', label: 'Poetry & Essays', description: 'Small forms, big feelings.' },
  { slug: 'seasonal-mood-reads', label: 'Seasonal & Mood Reads', description: 'Reads for the season you are in.' },
  { slug: 'books-like', label: 'Books Likeâ€¦', description: 'If you loved X, you will love these.' },
];

/**
 * Converts an arbitrary label into a URL slug.
 * Handles the "&" and "â€¦" characters explicitly so "Fantasy & Romance"
 * becomes "fantasy-and-romance", not "fantasy--romance".
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/â€¦/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Looks up a category by its URL slug. */
export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/**
 * Looks up a category by its display label. Returns a safe fallback
 * object if the label is unknown so pages never crash on a typo.
 */
export function categoryForLabel(label: string): Category {
  const slug = slugify(label);
  return (
    CATEGORIES.find((c) => c.slug === slug || c.label === label) ?? {
      slug,
      label,
      description: `Posts about ${label}.`,
    }
  );
}
