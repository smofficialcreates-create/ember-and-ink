import type { BlogPost } from './posts';
import { formatDate, readingTime } from './format';
import { withAmazonTag } from './amazon';

export interface CuratedGenre {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
  motif: string;
  matchCategories: string[];
}

export const CURATED_GENRES: ReadonlyArray<CuratedGenre> = [
  {
    id: 'fantasy-romance',
    name: 'Fantasy & Romance',
    shortName: 'Romantasy',
    tagline: 'Sweeping courts, slow-burn fire, and realms that linger.',
    accent: '#c97b84',
    badgeBg: 'bg-[#5b1f2e]/10 dark:bg-[#5b1f2e]/30',
    badgeText: 'text-[#8c2b3f]',
    borderHover: 'hover:border-[#c97b84]',
    motif: '❦',
    matchCategories: ['Fantasy Romance', 'Romance', 'Fantasy'],
  },
  {
    id: 'literary-fiction',
    name: 'Literary & Contemporary Fiction',
    shortName: 'Literary',
    tagline: 'Modern life, intricate human truths, and character-driven prose.',
    accent: '#8b5e3c',
    badgeBg: 'bg-[#8b5e3c]/10',
    badgeText: 'text-[#6e4324]',
    borderHover: 'hover:border-[#8b5e3c]',
    motif: '❖',
    matchCategories: [
      'Contemporary Fiction',
      'Literary Fiction',
      'Young Adult',
      'Seasonal & Mood Reads',
      'Books Like…',
    ],
  },
  {
    id: 'self-help',
    name: 'Self-Help & Personal Growth',
    shortName: 'Self-Help',
    tagline: 'Quiet discipline, intentional habits, and grounding daily practices.',
    accent: '#3d5a45',
    badgeBg: 'bg-[#3d5a45]/10',
    badgeText: 'text-[#2a4231]',
    borderHover: 'hover:border-[#3d5a45]',
    motif: '✦',
    matchCategories: ['Self-Help'],
  },
  {
    id: 'psychology-philosophy',
    name: 'Psychology & Philosophy',
    shortName: 'Philosophy',
    tagline: 'Human behavior, deep cognition, and timeless existential thought.',
    accent: '#42526c',
    badgeBg: 'bg-[#42526c]/10',
    badgeText: 'text-[#2a384e]',
    borderHover: 'hover:border-[#42526c]',
    motif: '⚖',
    matchCategories: ['Philosophy', 'Nonfiction'],
  },
  {
    id: 'mystery-thriller',
    name: 'Mystery & Thriller',
    shortName: 'Thriller',
    tagline: 'Shadow-slicked corridors, psychological twists, and hidden confessions.',
    accent: '#4a3856',
    badgeBg: 'bg-[#4a3856]/10',
    badgeText: 'text-[#352540]',
    borderHover: 'hover:border-[#4a3856]',
    motif: '☽',
    matchCategories: ['Mystery & Thriller', 'Horror'],
  },
  {
    id: 'science-knowledge',
    name: 'Science & Knowledge',
    shortName: 'Science',
    tagline: 'Big inquiries, behavioural economics, and systems of our world.',
    accent: '#2c575d',
    badgeBg: 'bg-[#2c575d]/10',
    badgeText: 'text-[#1c3f44]',
    borderHover: 'hover:border-[#2c575d]',
    motif: '⚛',
    matchCategories: ['Science Fiction'],
  },
  {
    id: 'classics-historical',
    name: 'Classics & Historical Fiction',
    shortName: 'Classics',
    tagline: 'Enduring masterpieces, forgotten centuries, and timeworn archives.',
    accent: '#7a4d2b',
    badgeBg: 'bg-[#7a4d2b]/10',
    badgeText: 'text-[#5a3418]',
    borderHover: 'hover:border-[#7a4d2b]',
    motif: '🏛',
    matchCategories: [
      'Classics',
      'Hindi Classics',
      'Historical Fiction',
      'Dark Academia & Gothic',
      'Poetry & Essays',
    ],
  },
];

/**
 * Verified book metadata dictionary matching the content collection.
 * This guarantees pristine book titles, author bylines, and ratings
 * without inventing any ungrounded data.
 */
const VERIFIED_BOOK_METADATA: Record<
  string,
  {
    bookTitle: string;
    author: string;
    rating?: number;
    ratingStars?: string;
    shelfId: string;
    verdictShort?: string;
    highlights?: string[];
  }
> = {
  'fantasy-romance-fourth-wing': {
    bookTitle: 'Fourth Wing',
    author: 'Rebecca Yarros',
    rating: 4.0,
    ratingStars: '★★★★☆',
    shelfId: 'fantasy-romance',
    verdictShort: 'A breathless romantasy where enemies-to-lovers feels genuinely earned through high stakes and electric tension.',
    highlights: ['Earned slow-burn tension', 'Sharp dragon characterization', 'Fast narrative momentum'],
  },
  'iron-flame': {
    bookTitle: 'Iron Flame',
    author: 'Rebecca Yarros',
    rating: 4.0,
    ratingStars: '★★★★☆',
    shelfId: 'fantasy-romance',
    verdictShort: 'A sprawling, high-stakes sequel that doubles down on Basgiath political intrigue and dragon lore.',
    highlights: ['Expanded continent lore', 'Violet’s fierce resilience', 'Relentless cliffhanger pacing'],
  },
  'a-court-of-thorns-and-roses': {
    bookTitle: 'A Court of Thorns and Roses',
    author: 'Sarah J. Maas',
    shelfId: 'fantasy-romance',
    verdictShort: 'The foundational modern fairy-tale retelling that catapulted romantasy into a cultural phenomenon.',
    highlights: ['Atmospheric Spring Court', 'Slow-building fae mystery', 'Iconic high-fantasy worldbuilding'],
  },
  'once-upon-a-broken-heart': {
    bookTitle: 'Once Upon a Broken Heart',
    author: 'Stephanie Garber',
    shelfId: 'fantasy-romance',
    verdictShort: 'A whimsical, bittersweet fairy-tale fantasy rich with fateful bargains, apple scents, and heart-wrenching yearning.',
    highlights: ['Enchanting prose style', 'Jacks the Prince of Hearts', 'Surreal Northern worldbuilding'],
  },
  'the-serpent-and-the-wings-of-night': {
    bookTitle: 'The Serpent and the Wings of Night',
    author: 'Carissa Broadbent',
    shelfId: 'fantasy-romance',
    verdictShort: 'A brutal, gothic vampire tournament romance featuring razor-sharp combat and gut-twisting betrayal.',
    highlights: ['Deadly Oraya & Raihn dynamic', 'Gothic arena atmosphere', 'Rich vampire lineage lore'],
  },
  'self-help-deep-work': {
    bookTitle: 'Deep Work',
    author: 'Cal Newport',
    rating: 4.0,
    ratingStars: '★★★★☆',
    shelfId: 'self-help',
    verdictShort: 'The definitive manifesto on reclaiming undistracted cognitive focus in an economy designed to shred attention.',
    highlights: ['90-minute focus blocks', 'The shutdown ritual', 'Actionable distraction boundaries'],
  },
  'the-5am-club': {
    bookTitle: 'The 5 AM Club',
    author: 'Robin Sharma',
    shelfId: 'self-help',
    verdictShort: 'A structured morning routine framework centered on the 20/20/20 formula for health, reflection, and mastery.',
    highlights: ['The 20/20/20 blueprint', 'Quiet pre-dawn hours', 'Habit installation psychology'],
  },
  'can-t-hurt-me': {
    bookTitle: "Can't Hurt Me",
    author: 'David Goggins',
    shelfId: 'self-help',
    verdictShort: 'An uncompromising, raw memoir on shattering excuses and mastering the internal dialogue through pure grit.',
    highlights: ['The Accountability Mirror', 'The 40% Rule', 'Raw, unfiltered truth'],
  },
  'the-psychology-of-money': {
    bookTitle: 'The Psychology of Money',
    author: 'Morgan Housel',
    shelfId: 'psychology-philosophy',
    verdictShort: 'A masterclass in human irrationality showing that financial success is about behavior, not raw intelligence.',
    highlights: ['Ego vs. wealth wisdom', 'Compounding patience', 'The power of "enough"'],
  },
  'thinking-fast-and-slow': {
    bookTitle: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    shelfId: 'psychology-philosophy',
    verdictShort: 'Nobel laureate Daniel Kahneman’s landmark breakdown of the dual cognitive systems driving human judgment.',
    highlights: ['System 1 vs. System 2', 'Cognitive heuristic traps', 'Foundational behavioral science'],
  },
  'the-silent-patient': {
    bookTitle: 'The Silent Patient',
    author: 'Alex Michaelides',
    shelfId: 'mystery-thriller',
    verdictShort: 'A labyrinthine psychological thriller weaving Greek tragedy motifs with a jaw-dropping final twist.',
    highlights: ['Unreliable narrative layers', 'Gothic psychiatric clinic setting', 'Masterful pacing'],
  },
  'verity': {
    bookTitle: 'Verity',
    author: 'Colleen Hoover',
    shelfId: 'mystery-thriller',
    verdictShort: 'A claustrophobic, morally chilling manuscript mystery that forces readers to question every single word.',
    highlights: ['The sinister manuscript conceit', 'Unsettling domestic tension', 'Unforgettable ending debate'],
  },
  'if-we-were-villains': {
    bookTitle: 'If We Were Villains',
    author: 'M.L. Rio',
    rating: 4.5,
    ratingStars: '★★★★½',
    shelfId: 'mystery-thriller',
    verdictShort: 'A Shakespearean Dark Academia thriller of deadly rivalry, theatrical obsession, and tragic secrets.',
    highlights: ['Lush Dark Academia atmosphere', 'Shakespearean tragedy tension', 'Unforgettable ensemble cast'],
  },
  'a-court-of-mist-and-fury': {
    bookTitle: 'A Court of Mist and Fury',
    author: 'Sarah J. Maas',
    rating: 5.0,
    ratingStars: '★★★★★',
    shelfId: 'fantasy-romance',
    verdictShort: 'The emotional high-water mark of modern romantasy exploring trauma recovery, autonomy, and epic slow-burn love.',
    highlights: ['Trauma healing & autonomy', 'The iconic Night Court inner circle', 'Sensational enemies-to-lovers slow burn'],
  },
  'the-mountain-is-you': {
    bookTitle: 'The Mountain Is You',
    author: 'Brianna Wiest',
    rating: 4.5,
    ratingStars: '★★★★½',
    shelfId: 'self-help',
    verdictShort: 'A transformative guide showing that self-sabotage is a miscommunicated need for growth, not a personal flaw.',
    highlights: ['Self-sabotage psychology', 'Emotional intelligence over brute force', 'Actionable internal shifts'],
  },
  'rashmirathi': {
    bookTitle: 'Rashmirathi',
    author: 'Ramdhari Singh Dinkar',
    rating: 5.0,
    ratingStars: '★★★★★',
    shelfId: 'classics-historical',
    verdictShort: 'A timeless Hindi epic poem exploring righteousness, tragic destiny, and Karna’s unyielding valor.',
    highlights: ['Profound philosophical depth', 'Electrifying poetic rhythm', 'Tragic heroic journey of Karna'],
  },
  'the-stranger': {
    bookTitle: 'The Stranger',
    author: 'Albert Camus',
    rating: 4.5,
    ratingStars: '★★★★½',
    shelfId: 'psychology-philosophy',
    verdictShort: 'Albert Camus’s foundational existential masterpiece examining absurdism, society’s hypocrisies, and quiet defiance.',
    highlights: ['Foundational philosophy of the absurd', 'Crystalline, unflinching prose', 'Enduring existential questions'],
  },
  'cozy-fantasy-self-help': {
    bookTitle: 'Cozy Fantasy + Self-Help',
    author: 'Curated by Ember & Ink',
    rating: 5.0,
    ratingStars: '★★★★★',
    shelfId: 'literary-fiction',
    verdictShort: 'A curated reading journey pairing restorative low-stakes fantasy with compassionate personal essays.',
    highlights: ['Gentle autumn atmosphere', 'Low-stress restorative pacing', 'Perfect mood-pairing guide'],
  },
};

export interface BookEditorialMeta {
  bookTitle: string;
  author: string;
  genre: string;
  curatedShelf: CuratedGenre;
  rating: number | null;
  ratingStars: string | null;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  amazonLink: string | null;
  readTime: string;
  publishedFormatted: string;
  publishedIso: string;
  isFeatured: boolean;
  verdictShort: string;
  highlights: string[];
}

/**
 * Returns clean, editorial-quality book metadata for any BlogPost.
 */
export function getBookEditorialMeta(post: BlogPost): BookEditorialMeta {
  const verified = VERIFIED_BOOK_METADATA[post.id];

  // Derive title & author
  let bookTitle = verified?.bookTitle;
  let author = verified?.author;

  if (!bookTitle) {
    // 1. Check title for "Book Title by Author"
    const byMatch = post.data.title.match(/^([^:]+?)\s+by\s+([^:]+?)(?::|$)/i);
    if (byMatch) {
      bookTitle = byMatch[1].trim();
      author = byMatch[2].trim();
    } else {
      bookTitle = post.data.title.replace(/Review:.*$/i, '').replace(/:\s*A Review.*$/i, '').trim();
    }
  }

  if (!author) {
    // 2. Check description for "Author's Book Title" or "by Author"
    const descAuthorMatch =
      post.data.description.match(/(?:discover\s+(?:why|how|the\s+secrets\s+in)|in)\s+([A-Z][a-zA-Z\.\s]{1,30}?)'s\s+/i) ||
      post.data.description.match(/\bby\s+([A-Z][a-zA-Z\.\s]{1,30}?)(?:'s|\s+is|\.|\,|$)/i);

    if (descAuthorMatch) {
      author = descAuthorMatch[1].trim();
    } else {
      // 3. Check tags for author name pattern (2-3 capitalized words)
      const excludedTags = new Set([
        'BookTok', 'Thriller', 'Romantasy', 'Self-Help', 'Mindset', 'Classic Books',
        'Indian Literature', 'Hindi Poetry', 'Mahabharata', 'Gothic', 'Shakespeare',
        'Dark Academia', 'Enemies to Lovers', 'Psychological Thriller', 'Personal Growth',
        'Habit Building', 'Book Review', 'Classic Literature', 'Existentialism', 'Absurdism'
      ]);
      const authorTag = post.data.tags.find(
        (t) => !excludedTags.has(t) && /^[A-Z][a-z\.]+(?:\s+[A-Z][a-z\.]+){1,2}$/.test(t.trim())
      );
      author = authorTag ? authorTag.trim() : 'Acclaimed Author';
    }
  }

  // Derive Curated Shelf
  let shelf: CuratedGenre | undefined;
  if (verified?.shelfId) {
    shelf = CURATED_GENRES.find((g) => g.id === verified.shelfId);
  }
  if (!shelf) {
    shelf = CURATED_GENRES.find((g) => g.matchCategories.includes(post.data.category));
  }
  if (!shelf) {
    shelf = CURATED_GENRES[1]; // Fallback to Literary & Contemporary Fiction
  }

  // Check rating from post body if not in verified list
  let rating = verified?.rating ?? null;
  let ratingStars = verified?.ratingStars ?? null;

  if (!ratingStars && post.body) {
    const starMatch = post.body.match(/([★☆]{3,5})/);
    if (starMatch) {
      ratingStars = starMatch[1];
      const filled = (ratingStars.match(/★/g) || []).length;
      rating = filled;
    }
  }

  const amazonUrl = withAmazonTag(post.data.amazonLink) || null;

  return {
    bookTitle,
    author: author || 'Ember & Ink Review',
    genre: post.data.category,
    curatedShelf: shelf,
    rating,
    ratingStars,
    excerpt: post.data.description,
    coverImage: post.data.coverImage || '/og-default.svg',
    coverAlt: post.data.coverAlt || `Book cover for ${bookTitle}`,
    amazonLink: amazonUrl,
    readTime: readingTime(post.body),
    publishedFormatted: formatDate(post.data.pubDate),
    publishedIso: post.data.pubDate.toISOString(),
    isFeatured: post.data.featured || false,
    verdictShort:
      verified?.verdictShort ||
      post.data.description ||
      'A thoughtful examination for passionate readers.',
    highlights: verified?.highlights || [
      'Original prose voice',
      'Curated literary perspective',
      'Honest editorial verdict',
    ],
  };
}
