import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './categories';

/**
 * The concrete type of a blog entry, derived from the collection schema.
 * Everywhere else in the site we refer to this type, never to the raw
 * collection, so refactors stay local.
 */
export type BlogPost = CollectionEntry<'blog'>;

/**
 * All non-draft posts, newest first.
 *
 * Drafts are hidden in production builds but visible in `astro dev`,
 * so authors can preview work-in-progress locally without risk of
 * leaking it to production.
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => {
    if (data.draft && import.meta.env.PROD) return false;
    return true;
  });

  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/**
 * Posts marked `featured: true` in frontmatter, in publish-date order.
 * Used by the home page hero and any "editor's pick" sections.
 */
export async function getFeaturedPosts(limit = 3): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.featured).slice(0, limit);
}

/**
 * Posts that belong to a single category (by the schema's label, e.g.
 * "Self-Help" — not the URL slug).
 */
export async function getPostsByCategory(categoryLabel: string): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.category === categoryLabel);
}

/**
 * Posts that carry a specific tag (case-sensitive match against the
 * stored tag; if you want case-insensitive lookup, normalize upstream).
 */
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.tags.includes(tag));
}

/**
 * Related posts for a given post.
 * Scoring:
 *   +5  same category
 *   +1  for each shared tag
 * Deterministic, no randomness, so the "related" list is stable across
 * builds (good for CDN caching and for readers).
 */
export async function getRelatedPosts(
  current: BlogPost,
  limit = 3,
): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  const currentTags = new Set(current.data.tags);

  const scored = posts
    .filter((p) => p.id !== current.id)
    .map((p) => {
      let score = 0;
      if (p.data.category === current.data.category) score += 5;
      for (const tag of p.data.tags) {
        if (currentTags.has(tag)) score += 1;
      }
      return { post: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ post }) => post);
}

/**
 * All tags used across published posts, with post counts, sorted by
 * popularity. `slug` is the URL-safe form used in `/tags/<slug>/`.
 */
export async function getAllTags(): Promise<
  Array<{ tag: string; slug: string; count: number }>
> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count, slug: slugify(tag) }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}