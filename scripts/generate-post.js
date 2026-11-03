import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

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

async function generate() {
  const fileContent = fs.readFileSync(BOOKS_FILE, 'utf8').trim();
  if (!fileContent) return console.log('Queue is empty.');

  const books = fileContent.split('\n').map(b => b.trim()).filter(Boolean);
  const bookToProcess = books[0];
  console.log(`Processing: ${bookToProcess}`);

  // 1. Fetch REAL book cover from Google Books API
  let coverImageUrl = null;
  try {
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(bookToProcess)}&maxResults=1`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (data.items && data.items[0].volumeInfo.imageLinks) {
      coverImageUrl = data.items[0].volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
      // Get higher resolution if available
      coverImageUrl = coverImageUrl.replace('&zoom=1', '&zoom=0').replace('&edge=curl', '');
    }
  } catch (e) {
    console.log('Could not fetch Google Books cover.');
  }

  // 2. The AI Prompt
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
      "rating": "4.5",
      "summaryPoints": ["Point 1", "Point 2", "Point 3"],
      "keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
      "pinTitle": "Clickable Pinterest title",
      "pinDescription": "Pinterest SEO description",
      "pinHashtags": "#bookreview #booktok",
      "pinBottomCTA": "Must-Read Book - Check it out!"
    }
  `;

  try {
    // 3. Generate Content
    const rawText = await generateWithGemini(PRIMARY_MODEL, prompt);
    const data = JSON.parse(rawText);
    const cleanBookName = bookToProcess.split(' by ')[0];
    const slug = cleanBookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // 4. Create Markdown File & Save Blog Cover
    const localCoverPath = `/images/blog/${slug}.jpg`;
    if (coverImageUrl) {
      const imgBuffer = await (await fetch(coverImageUrl)).arrayBuffer();
      fs.writeFileSync(path.join(process.cwd(), 'public', localCoverPath), Buffer.from(imgBuffer));
    }

    const frontmatter = `---
title: "${data.blogTitle.replace(/"/g, '\\"')}"
description: "${data.blogDescription.replace(/"/g, '\\"')}"
pubDate: ${new Date().toISOString().split('T')[0]}
category: "${data.category}"
tags: ${JSON.stringify(data.tags)}
coverImage: "${coverImageUrl ? localCoverPath : ''}"
amazonLink: "https://www.amazon.com/s?k=${encodeURIComponent(cleanBookName)}&tag=shubhstor0de4-21"
draft: false
featured: false
---
${data.blogContent}
`;
    fs.writeFileSync(path.join(process.cwd(), 'src', 'content', 'blog', `${slug}.md`), frontmatter);

    // 5. Create Pinterest Folder & Text
    const pinDir = path.join(process.cwd(), 'pinterest', `${slug}`);
    if (!fs.existsSync(pinDir)) fs.mkdirSync(pinDir, { recursive: true });
    fs.writeFileSync(path.join(pinDir, 'pin-text.txt'), `TITLE:\n${data.pinTitle}\n\nDESCRIPTION:\n${data.pinDescription}\n\nHASHTAGS:\n${data.pinHashtags}\n\nLINK:\nhttps://ember-and-ink.sm-officialcreates.workers.dev/blog/${slug}/`);

    // 6. Render Pinterest Image using Puppeteer (HTML -> PNG)
    console.log('Rendering Pinterest image...');
    const stars = '★'.repeat(Math.floor(parseFloat(data.rating))) + '☆'.repeat(5 - Math.floor(parseFloat(data.rating)));
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Lora:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; padding: 0; width: 1000px; height: 1500px; background-color: #F7F5F0; font-family: 'Caveat', cursive; overflow: hidden; }
          .container { position: relative; width: 100%; height: 100%; padding: 50px; box-sizing: border-box; }
          
          .stars { font-size: 60px; color: #1A1A1A; letter-spacing: 5px; position: absolute; top: 60px; left: 60px; }
          .rating { font-size: 55px; position: absolute; top: 150px; left: 80px; font-weight: bold; }
          
          .title { font-size: 60px; line-height: 1.1; position: absolute; top: 70px; right: 60px; width: 450px; text-align: left; color: #1A1A1A; }
          .author { font-size: 36px; position: absolute; top: 210px; right: 60px; color: #333; }
          
          .points { position: absolute; top: 300px; right: 60px; width: 420px; font-size: 32px; line-height: 1.4; }
          .points div { margin-bottom: 15px; }
          
          .book-wrapper { position: absolute; top: 550px; left: 200px; width: 400px; height: 600px; box-shadow: 15px 25px 30px rgba(0,0,0,0.25); transform: rotate(-3deg); background: #fff; }
          .book-wrapper img { width: 100%; height: 100%; object-fit: cover; }
          
          .keywords { position: absolute; bottom: 250px; right: 60px; width: 350px; font-size: 32px; text-align: right; line-height: 1.8; }
          
          .cta-sticker { position: absolute; bottom: 120px; left: 200px; border: 2px solid #1A1A1A; padding: 15px 40px; font-size: 36px; background: #F7F5F0; }
          
          .footer { position: absolute; bottom: 40px; width: 100%; text-align: center; font-family: sans-serif; font-size: 16px; letter-spacing: 4px; color: #888; }
          
          /* Hand-drawn arrows (SVG background) */
          .arrow { position: absolute; }
          .arrow-1 { top: 850px; left: 100px; }
          .arrow-2 { top: 850px; right: 100px; transform: scaleX(-1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="stars">${stars}</div>
          <div class="rating">${data.rating}/5</div>
          
          <div class="title">${cleanBookName}</div>
          <div class="author">by ${data.author}</div>
          
          <div class="points">
            ${data.summaryPoints.map(p => `<div>- ${p}</div>`).join('')}
          </div>

          <div class="book-wrapper">
            ${coverImageUrl ? `<img src="${coverImageUrl}" />` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:40px; text-align:center; padding:20px;">${cleanBookName}</div>`}
          </div>

          <div class="keywords">
            ${data.keywords.map(k => `<div>${k}</div>`).join('')}
          </div>

          <!-- Curved arrows pointing to keywords -->
          <svg class="arrow arrow-1" width="100" height="100" viewBox="0 0 100 100" fill="none"><path d="M10,80 Q40,80 60,40" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round"/><polygon points="60,40 50,45 65,30" fill="#1A1A1A"/></svg>
          <svg class="arrow arrow-2" width="100" height="100" viewBox="0 0 100 100" fill="none"><path d="M10,80 Q40,80 60,40" stroke="#1A1A1A" stroke-width="3" stroke-linecap="round"/><polygon points="60,40 50,45 65,30" fill="#1A1A1A"/></svg>

          <div class="cta-sticker">${data.pinBottomCTA}</div>
          <div class="footer">EMBERANDINK.COM</div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(pinDir, 'pin-image.png') });
    await browser.close();

    // 7. Cleanup queue
    fs.writeFileSync(BOOKS_FILE, books.slice(1).join('\n'));
    console.log(`Success! Generated beautiful assets for: ${cleanBookName}`);

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}
generate();
