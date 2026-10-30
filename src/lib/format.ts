/**
 * Small, dependency-free formatters.
 * Keeping these isolated makes them easy to unit-test and easy to swap
 * out (e.g. adding i18n later) without touching component code.
 */

/** Formats a Date or ISO string as "Month D, YYYY" in UTC. */
export function formatDate(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Approximate reading time in minutes, assuming ~220 words per minute.
 * Uses `post.body` (raw markdown) as the source, which is close enough
 * for a preview without parsing HTML.
 */
export function readingTime(markdown: string | undefined): string {
  const words = (markdown ?? '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

/** Truncates text at a word boundary and appends an ellipsis. */
export function truncate(text: string, length = 160): string {
  if (text.length <= length) return text;
  const cut = text.slice(0, length - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}