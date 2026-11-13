import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Blog collection.
 *
 * Every post's frontmatter MUST satisfy this schema. The build fails
 * if a required field is missing or malformed â€” this guarantees a
 * stable, predictable content contract for authors and AI generators.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(40).max(300),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    category: z.enum([
      'Self-Help',
      'Fantasy Romance',
      'Romance',
      'Fantasy',
      'Mystery & Thriller',
      'Contemporary Fiction',
      'Young Adult',
      'Historical Fiction',
      'Science Fiction',
      'Horror',
      'Nonfiction',
      'Poetry & Essays',
      'Seasonal & Mood Reads',
      'Books Likeâ€¦',
    ]),

    tags: z.array(z.string()).default([]),

    /**
     * Path relative to `public/`, e.g. "/images/blog/my-cover.png".
     * Optional â€” the site falls back to the default OG image.
     */
    coverImage: z.string().optional(),
    coverAlt: z.string().max(180).optional(),

    /** Amazon product URL. The associate tag is added automatically. */
    amazonLink: z.string().url().optional(),

    /** Drafts are hidden in production builds, visible in `astro dev`. */
    draft: z.boolean().default(false),

    /** Surface this post on the home page. */
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };

