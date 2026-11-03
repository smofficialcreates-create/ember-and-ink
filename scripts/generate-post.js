import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash',
  generationConfig: { responseMimeType: "application/json" }
});

const BOOKS_FILE = path.join(process.cwd(), 'scripts', 'books.txt');

async function generate() {
  if (!fs.existsSync(BOOKS_FILE)) return console.log('No books.txt found.');
  const fileContent = fs.readFileSync(BOOKS_FILE, 'utf8').trim();
  if (!fileContent) return console.log('Queue is empty.');

  const books = fileContent.split('\n').map(b => b.trim()).filter(Boolean);
  const bookToProcess = books[0];
  console.log(`Processing: ${bookToProcess}`);

  let coverImageUrl = null;
  try {
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(bookToProcess)}&limit=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    if (data.docs && data.docs[0] && data.docs[0].cover_i) {
      coverImageUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
      console.log(`Found cover image: ${coverImageUrl}`);
    }
  } catch (e) {
    console.log('Could not fetch real cover, using fallback.');
  }

  const prompt = `
    You are an expert book blogger and Pinterest strategist. Research the book "${bookToProcess}".
    Return a JSON object with this exact structure:
    {
      "author": "Author's name",
      "category": "Pick ONLY ONE: ['Self-Help', 'Fantasy Romance', 'Romance', 'Fantasy', 'Mystery & Thriller', 'Contemporary Fiction', 'Young Adult', 'Historical Fiction', 'Science Fiction', 'Horror', 'Nonfiction', 'Poetry & Essays', 'Seasonal & Mood Reads', 'Books Like…']",
      "tags": ["tag1", "tag2", "tag3"],
      "blogTitle": "SEO optimized blog title",
      "blogDescription": "150 character meta description for Google",
      "blogContent": "Write 4-5 paragraphs (Markdown). Intro, spoiler-free summary, who it's for, call to action.",
      "rating": "4.5",
      "summaryPoints": [
        "Short bullet point 1 (max 5 words)",
        "Short bullet point 2 (max 5 words)",
        "Short bullet point 3 (max 5 words)"
      ],
      "keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
      "pinTitle": "Clickable Pinterest title",
      "pinDescription": "Pinterest SEO description with keywords and call to action.",
      "pinHashtags": "#bookreview #booktok #mustread",
      "pinBottomCTA": "Must-Read Book - Check it out!"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    const cleanBookName = bookToProcess.split(' by ')[0];
    const slug = cleanBookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanBookName)}&tag=shubhstor0de4-21`;
    
    const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#5B1F2A"/><text x="600" y="375" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#FBF6EE">${cleanBookName}</text><text x="600" y="450" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#E8D9A8">by ${data.author}</text></svg>`;
    fs.writeFileSync(path.join(process.cwd(), 'public', 'images', 'blog', `${slug}.svg`), coverSvg);

    const frontmatter = `---
title: "${data.blogTitle.replace(/"/g, '\\"')}"
description: "${data.blogDescription.replace(/"/g, '\\"')}"
pubDate: ${new Date().toISOString().split('T')[0]}
category: "${data.category}"
tags: ${JSON.stringify(data.tags)}
coverImage: "/images/blog/${slug}.svg"
amazonLink: "${amazonSearchUrl}"
draft: false
featured: false
---

${data.blogContent}
`;
    fs.writeFileSync(path.join(process.cwd(), 'src', 'content', 'blog', `${slug}.md`), frontmatter);

    const pinDir = path.join(process.cwd(), 'pinterest', `${slug}`);
    if (!fs.existsSync(pinDir)) fs.mkdirSync(pinDir, { recursive: true });

    const pinText = `TITLE:\n${data.pinTitle}\n\nDESCRIPTION:\n${data.pinDescription}\n\nHASHTAGS:\n${data.pinHashtags}\n\nLINK:\nhttps://ember-and-ink.sm-officialcreates.workers.dev/blog/${slug}/`;
    fs.writeFileSync(path.join(pinDir, 'pin-text.txt'), pinText);

    const stars = [];
    const rating = parseFloat(data.rating) || 5;
    for (let i = 0; i < 5; i++) {
      const fill = i < Math.floor(rating) ? "#111" : "none";
      const x = 100 + (i * 60);
      stars.push(`<polygon points="${x},100 ${x+15},140 ${x+55},140 ${x+25},165 ${x+35},205 ${x},180 ${x-35},205 ${x-25},165 ${x-55},140 ${x-15},140" fill="${fill}" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`);
    }

    const summaryText = data.summaryPoints.map((p, i) => `<text x="550" y="${350 + (i * 80)}" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="32" fill="#111">- ${p}</text>`).join('');
    const keywordText = data.keywords.map((k, i) => `<text x="700" y="${900 + (i * 90)}" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="28" fill="#111">${k}</text>`).join('');

    const bookImage = coverImageUrl 
      ? `<image href="${coverImageUrl}" x="250" y="450" width="400" height="600" preserveAspectRatio="xMidYMid slice" />`
      : `<rect x="250" y="450" width="400" height="600" fill="#5B1F2A" /><text x="450" y="750" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#FBF6EE">${cleanBookName}</text>`;

    const pinSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500">
      <rect width="1000" height="1500" fill="#F3EBE1"/>
      ${stars.join('')}
      <text x="180" y="280" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="48" fill="#111">${rating}/5</text>
      <text x="550" y="120" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="42" fill="#111">${cleanBookName}</text>
      <text x="550" y="170" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="32" fill="#111">by ${data.author}</text>
      ${summaryText}
      <filter id="shadow">
        <feDropShadow dx="10" dy="15" stdDeviation="10" flood-opacity="0.3"/>
      </filter>
      <g filter="url(#shadow)" transform="rotate(-3 450 750)">
        ${bookImage}
      </g>
      <path d="M 200 850 Q 250 850 280 800" stroke="#111" stroke-width="4" fill="none" marker-end="url(#arrowhead)"/>
      <path d="M 750 820 Q 700 820 680 780" stroke="#111" stroke-width="4" fill="none" marker-end="url(#arrowhead)"/>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#111" />
        </marker>
      </defs>
      ${keywordText}
      <g transform="translate(250, 1300)">
        <rect width="500" height="80" fill="#F3EBE1" stroke="#111" stroke-width="2" rx="5"/>
        <text x="250" y="50" text-anchor="middle" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="32" fill="#111">${data.pinBottomCTA}</text>
      </g>
      <text x="500" y="1450" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" fill="#666" letter-spacing="2">EMBERANDINK.COM</text>
    </svg>`;

    await sharp(Buffer.from(pinSvg)).png().toFile(path.join(pinDir, 'pin-image.png'));

    fs.writeFileSync(BOOKS_FILE, books.slice(1).join('\n'));
    console.log(`Success! Generated blog and Pinterest assets for: ${cleanBookName}`);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1); 
  }
}

generate();
