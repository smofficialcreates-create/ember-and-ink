import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const PRIMARY_MODEL = 'gemini-3.5-flash-lite'; 
const FALLBACK_MODEL = 'gemini-3.8-flash';     

const BOOKS_FILE = path.join(process.cwd(), 'scripts', 'books.txt');
const blogImgDir = path.join(process.cwd(), 'public', 'images', 'blog');
if (!fs.existsSync(blogImgDir)) fs.mkdirSync(blogImgDir, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithGemini(modelName, prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName, contents: prompt, config: { responseMimeType: "application/json" }
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

async function fetchBestCover(title, author) {
  try {
    const olRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`);
    const olData = await olRes.json();
    if (olData.docs && olData.docs[0] && olData.docs[0].cover_i) {
      return `https://covers.openlibrary.org/b/id/${olData.docs[0].cover_i}-L.jpg`;
    }
  } catch (e) {}

  try {
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}&maxResults=5`);
    const gbData = await gbRes.json();
    if (gbData.items) {
      const validBook = gbData.items.find(item => {
        const t = item.volumeInfo.title.toLowerCase();
        return !t.includes('summary') && !t.includes('workbook') && item.volumeInfo.imageLinks;
      });
      if (validBook && validBook.volumeInfo.imageLinks.thumbnail) {
        return validBook.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://').replace('&zoom=1', '&zoom=0').replace('&edge=curl', '');
      }
    }
  } catch (e) {}
  return null;
}

async function createFallbackCover(title, author, slug) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5B1F2A"/>
          <stop offset="1" stop-color="#2B2118"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="750" fill="url(#grad)"/>
      <line x1="400" y1="520" x2="800" y2="520" stroke="#C9A227" stroke-width="2" opacity="0.6"/>
      <text x="600" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#FBF6EE" font-weight="600">${title}</text>
      <text x="600" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#C9A227" font-style="italic">by ${author}</text>
    </svg>`;
  
  const outPath = path.join(blogImgDir, `${slug}-fallback.webp`);
  await sharp(Buffer.from(svg)).webp().toFile(outPath);
  return `/images/blog/${slug}-fallback.webp`;
}

async function generate() {
  const fileContent = fs.readFileSync(BOOKS_FILE, 'utf8').trim();
  if (!fileContent) return console.log('Queue is empty.');

  const books = fileContent.split('\n').map(b => b.trim()).filter(Boolean);
  const bookToProcess = books[0];
  console.log(`Processing: ${bookToProcess}`);

  const cleanBookName = bookToProcess.split(' by ')[0].trim();
  const extractedAuthor = bookToProcess.includes(' by ') ? bookToProcess.split(' by ')[1].trim() : '';
  const slug = cleanBookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const prompt = `
    You are an expert book blogger and Pinterest strategist. Research the book "${bookToProcess}".
    Return a JSON object with this exact structure:
    {
      "author": "Author's name",
      "category": "Pick ONLY ONE: ['Self-Help', 'Fantasy Romance', 'Romance', 'Fantasy', 'Mystery & Thriller', 'Contemporary Fiction', 'Young Adult', 'Historical Fiction', 'Science Fiction', 'Horror', 'Nonfiction', 'Poetry & Essays', 'Seasonal & Mood Reads', 'Books Like…']",
      "tags": ["tag1", "tag2"],
      "blogTitle": "SEO optimized blog title",
      "blogDescription": "150 character meta description",
      "blogContent": "Write 4-5 paragraphs (Markdown). Intro, summary, who it's for, CTA.",
      "pinTitle": "Highly clickable Pinterest title (max 100 chars)",
      "pinDescription": "Pinterest SEO description with keywords and a call to action to read the review.",
      "pinHashtags": "#bookreview #booktok #mustread (relevant hashtags)"
    }
  `;

  try {
    const rawText = await generateWithGemini(PRIMARY_MODEL, prompt);
    const data = JSON.parse(rawText);
    const authorName = data.author || extractedAuthor || 'Unknown Author';

    console.log('Fetching cover...');
    let coverImageUrl = await fetchBestCover(cleanBookName, authorName);
    let localCoverPath = `/images/blog/${slug}.webp`;
    const absoluteBlogImgPath = path.join(process.cwd(), 'public', localCoverPath);
    let coverSaved = false;

    if (coverImageUrl) {
      try {
        const imgRes = await fetch(coverImageUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        
        // HIGH-QUALITY IMAGE PROCESSING
        const imagePipeline = sharp(Buffer.from(arrayBuffer));
        const meta = await imagePipeline.metadata();
        
        if (meta.width && meta.width > 50) {
          let processed = imagePipeline;
          
          // If the image is small, upscale it smoothly and sharpen it
          if (meta.width < 800) {
            processed = processed.resize({ width: 800, kernel: 'lanczos3' }).sharpen();
          }
          
          // Save as high-quality WebP
          await processed.webp({ quality: 90 }).toFile(absoluteBlogImgPath);
          coverSaved = true;
        }
      } catch (e) {
        console.log('Failed to process cover image.');
      }
    }

    if (!coverSaved) {
      console.log('Using beautiful Ember & Ink fallback cover.');
      localCoverPath = await createFallbackCover(cleanBookName, authorName, slug);
    }

    const frontmatter = `---
title: "${data.blogTitle.replace(/"/g, '\\"')}"
description: "${data.blogDescription.replace(/"/g, '\\"')}"
pubDate: ${new Date().toISOString().split('T')[0]}
category: "${data.category}"
tags: ${JSON.stringify(data.tags)}
coverImage: "${localCoverPath}"
amazonLink: "https://www.amazon.com/s?k=${encodeURIComponent(cleanBookName)}&tag=shubhstor0de4-21"
draft: false
featured: false
---
${data.blogContent}
`;
    fs.writeFileSync(path.join(process.cwd(), 'src', 'content', 'blog', `${slug}.md`), frontmatter);

    const pinDir = path.join(process.cwd(), 'pinterest', `${slug}`);
    if (!fs.existsSync(pinDir)) fs.mkdirSync(pinDir, { recursive: true });
    
    fs.writeFileSync(path.join(pinDir, 'pin-text.txt'), 
`--- PINTEREST POST FOR: ${cleanBookName} ---

TITLE:
${data.pinTitle}

DESCRIPTION:
${data.pinDescription}

HASHTAGS:
${data.pinHashtags}

LINK TO BLOG:
https://ember-and-ink.sm-officialcreates.workers.dev/blog/${slug}/`);

    fs.writeFileSync(BOOKS_FILE, books.slice(1).join('\n'));
    console.log(`Success! Published blog and Pinterest text for: ${cleanBookName}`);

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}
generate();
