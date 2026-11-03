import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const PRIMARY_MODEL = 'gemini-3.5-flash-lite'; 
const FALLBACK_MODEL = 'gemini-3.8-flash';     
const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const BOOKS_FILE = path.join(process.cwd(), 'scripts', 'books.txt');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Ensure directories exist
const blogImgDir = path.join(process.cwd(), 'public', 'images', 'blog');
if (!fs.existsSync(blogImgDir)) fs.mkdirSync(blogImgDir, { recursive: true });

async function generateWithGemini(modelName, prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return response.text;
    } catch (error) {
      if ((error.message.includes('503') || error.message.includes('429')) && attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 2000);
      } else {
        throw error;
      }
    }
  }
}

async function generateWithOpenRouter(prompt) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("No OpenRouter API key.");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.statusText}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

async function generate() {
  if (!fs.existsSync(BOOKS_FILE)) return console.log('No books.txt found.');
  const fileContent = fs.readFileSync(BOOKS_FILE, 'utf8').trim();
  if (!fileContent) return console.log('Queue is empty.');

  const books = fileContent.split('\n').map(b => b.trim()).filter(Boolean);
  const bookToProcess = books[0];
  console.log(`Processing: ${bookToProcess}`);

  let coverImageUrl = null;
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookToProcess)}&limit=1`);
    const data = await res.json();
    if (data.docs && data.docs[0] && data.docs[0].cover_i) {
      coverImageUrl = `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
    }
  } catch (e) {}

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
      "summaryPoints": ["Point 1", "Point 2", "Point 3"],
      "keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
      "pinTitle": "Clickable Pinterest title",
      "pinDescription": "Pinterest SEO description with keywords and call to action.",
      "pinHashtags": "#bookreview #booktok #mustread",
      "pinBottomCTA": "Must-Read Book - Check it out!"
    }
  `;

  let rawText = "";
  try {
    try { rawText = await generateWithGemini(PRIMARY_MODEL, prompt); } 
    catch (e1) {
      try { rawText = await generateWithGemini(FALLBACK_MODEL, prompt); } 
      catch (e2) { rawText = await generateWithOpenRouter(prompt); }
    }

    const data = JSON.parse(rawText);
    const cleanBookName = bookToProcess.split(' by ')[0];
    const slug = cleanBookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(cleanBookName)}&tag=shubhstor0de4-21`;

    // 1. Create Markdown File
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

    // 2. Fix Blog Cover Image (So it shows on the website)
    const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#5B1F2A"/><text x="600" y="375" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#FBF6EE">${cleanBookName}</text><text x="600" y="450" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#E8D9A8">by ${data.author}</text></svg>`;
    fs.writeFileSync(path.join(blogImgDir, `${slug}.svg`), coverSvg);

    // 3. Fetch & Encode Font & Book Cover for Pinterest
    console.log('Fetching assets for Pinterest...');
    
    // Download Kalam handwritten font
    const fontRes = await fetch('https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Regular.ttf');
    const fontBase64 = Buffer.from(await fontRes.arrayBuffer()).toString('base64');

    // Download & resize Book Cover
    let bookBase64 = '';
    if (coverImageUrl) {
      const imgRes = await fetch(coverImageUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const resizedImg = await sharp(imgBuffer).resize({ width: 500, height: 750, fit: 'cover' }).jpeg().toBuffer();
      bookBase64 = resizedImg.toString('base64');
    }

    // 4. Create Pinterest Assets
    const pinDir = path.join(process.cwd(), 'pinterest', `${slug}`);
    if (!fs.existsSync(pinDir)) fs.mkdirSync(pinDir, { recursive: true });

    fs.writeFileSync(path.join(pinDir, 'pin-text.txt'), `TITLE:\n${data.pinTitle}\n\nDESCRIPTION:\n${data.pinDescription}\n\nHASHTAGS:\n${data.pinHashtags}\n\nLINK:\nhttps://ember-and-ink.sm-officialcreates.workers.dev/blog/${slug}/`);

    const stars = [];
    const rating = parseFloat(data.rating) || 5;
    for (let i = 0; i < 5; i++) {
      const fill = i < Math.floor(rating) ? "#111" : "none";
      const x = 100 + (i * 60);
      // Hand-drawn style star
      stars.push(`<path d="M ${x} 100 L ${x+15} 140 L ${x+55} 140 L ${x+25} 165 L ${x+35} 205 L ${x} 180 L ${x-35} 205 L ${x-25} 165 L ${x-55} 140 L ${x-15} 140 Z" fill="${fill}" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`);
    }

    // Use <foreignObject> to allow text wrapping, making it look like natural handwriting
    const summaryText = data.summaryPoints.map((p, i) => `<div style="margin-bottom: 15px;">- ${p}</div>`).join('');
    const keywordText = data.keywords.map((k, i) => `<div style="margin-bottom: 20px;">${k}</div>`).join('');

    const bookElement = bookBase64 
      ? `<image href="data:image/jpeg;base64,${bookBase64}" x="250" y="500" width="400" height="600" preserveAspectRatio="xMidYMid slice" />`
      : `<rect x="250" y="500" width="400" height="600" fill="#5B1F2A" /><text x="450" y="800" text-anchor="middle" font-family="'Kalam', cursive" font-size="40" fill="#FBF6EE">${cleanBookName}</text>`;

    const pinSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500">
      <defs>
        <style>
          @font-face {
            font-family: 'Kalam';
            src: url('data:font/ttf;base64,${fontBase64}') format('truetype');
          }
          .hand { font-family: 'Kalam', cursive; color: #111; }
          .shadow { filter: drop-shadow(8px 12px 10px rgba(0,0,0,0.3)); }
        </style>
        <filter id="shadow-filter">
          <feDropShadow dx="15" dy="20" stdDeviation="15" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background (Warm cozy cream) -->
      <rect width="1000" height="1500" fill="#F8F5F0"/>
      
      <!-- Stars & Rating -->
      ${stars.join('')}
      <text x="130" y="280" class="hand" font-size="50" fill="#111">${rating}/5</text>
      
      <!-- Title & Author (Right side) -->
      <foreignObject x="520" y="80" width="450" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" class="hand" style="font-size: 46px; line-height: 1.2;">
          ${cleanBookName}<br/>
          <span style="font-size: 32px;">by ${data.author}</span>
        </div>
      </foreignObject>
      
      <!-- Summary Points (Right side) -->
      <foreignObject x="520" y="320" width="450" height="300">
        <div xmlns="http://www.w3.org/1999/xhtml" class="hand" style="font-size: 28px; line-height: 1.4;">
          ${summaryText}
        </div>
      </foreignObject>
      
      <!-- The Book (Centered, slightly rotated) -->
      <g class="shadow" transform="rotate(-4 450 800)">
        ${bookElement}
      </g>

      <!-- Hand-drawn arrows pointing to the book -->
      <path d="M 220 900 Q 280 850 300 800" stroke="#111" stroke-width="4" fill="none" marker-end="url(#arrowhead)"/>
      <path d="M 720 880 Q 680 880 660 820" stroke="#111" stroke-width="4" fill="none" marker-end="url(#arrowhead)"/>
      <path d="M 450 1200 L 450 1130" stroke="#111" stroke-width="4" fill="none" marker-end="url(#arrowhead)"/>
      
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#111" />
        </marker>
      </defs>

      <!-- Keywords (Scattered) -->
      <foreignObject x="50" y="1150" width="250" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" class="hand" style="font-size: 28px;">${data.keywords[0] || ''}</div>
      </foreignObject>
      <foreignObject x="720" y="1000" width="250" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" class="hand" style="font-size: 28px;">${data.keywords[1] || ''}</div>
      </foreignObject>
      <foreignObject x="700" y="1200" width="250" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" class="hand" style="font-size: 28px;">${data.keywords[2] || ''}</div>
      </foreignObject>

      <!-- Bottom CTA Sticker -->
      <g transform="translate(250, 1350)">
        <rect width="500" height="80" fill="#F8F5F0" stroke="#111" stroke-width="2" rx="5"/>
        <text x="250" y="52" text-anchor="middle" class="hand" font-size="32">${data.pinBottomCTA}</text>
      </g>

      <!-- Brand Footer -->
      <text x="500" y="1470" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" fill="#888" letter-spacing="3">EMBERANDINK.COM</text>
    </svg>`;

    await sharp(Buffer.from(pinSvg)).png().toFile(path.join(pinDir, 'pin-image.png'));

    fs.writeFileSync(BOOKS_FILE, books.slice(1).join('\n'));
    console.log(`Success! Generated blog & Pinterest assets for: ${cleanBookName}`);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}
generate();
