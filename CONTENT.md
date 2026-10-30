# Adding Content to Ember & Ink

A practical, one-page guide to writing and publishing a new blog post.

---

## The 60-second version

1. Create `src/content/blog/your-slug.md` (slug = file name without `.md`).
2. Paste the frontmatter template below.
3. Fill in every required field.
4. Add a cover image to `public/images/blog/` (or skip and use the default).
5. `npm run dev` to preview, `npm run build` to ship.

That's it. If the build succeeds, the post is live.

---

## Frontmatter template

Copy this into every new `.md` file:

```yaml
---
title: "Your Post Title"
description: "A one-sentence summary (40–300 characters). Shown on cards, in search results, and as the meta description."
pubDate: 2025-06-01
updatedDate: 2025-06-15       # optional — omit if never updated
category: "Self-Help"
tags: ["focus", "habits", "productivity"]
coverImage: "/images/blog/your-slug.svg"
coverAlt: "A clear, descriptive sentence for screen readers."
amazonLink: "https://www.amazon.com/dp/XXXXXXXXXX"
draft: false
featured: false
---