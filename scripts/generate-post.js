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

  const cleanBookName = bookToProcess.split(' by ')[0].trim();
  const slug = cleanBookName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // 1. Bulletproof Cover Fetching (Ignoring fake Summary covers)
  let coverImageUrl = null;
  try {
    const query = encodeURIComponent(`intitle:"${cleanBookName}"`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10`);
    const data = await res.json();
    
    if (data.items) {
      // Find the first cover that is NOT a summary/workbook
      const validBook = data.items.find(item => {
        const title = item.volumeInfo.title.toLowerCase();
        return !title.includes('summary') && !title.includes('workbook') && !title.includes('study guide') && item.volumeInfo.imageLinks;
      });

      if (validBook) {
        coverImageUrl = validBook.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://').replace('&zoom=1', '&zoom=0');
      }
    }
  } catch (e) {
    console.log('Google Books API failed.');
  }

  // 2. AI Prompt (Strict instructions for short, punchy text)
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
      "summaryPoints": ["Short sentence 1", "Short sentence 2", "Short sentence 3"],
      "keywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
      "pinTitle": "Clickable Pinterest title",
      "pinDescription": "Pinterest SEO description",
      "pinHashtags": "#bookreview #booktok",
      "pinBottomCTA": "Must-Read Book - Check it out!"
    }
  `;

  try {
    const rawText = await generateWithGemini(PRIMARY_MODEL, prompt);
    const data = JSON.parse(rawText);
    
    // 3. Generate Beautiful Fallback Cover for Blog (If API fails)
    let localCoverPath = `/images/blog/${slug}.jpg`;
    const absoluteBlogImgPath = path.join(process.cwd(), 'public', localCoverPath);

    if (coverImageUrl) {
      const imgBuffer = await (await fetch(coverImageUrl)).arrayBuffer();
      fs.writeFileSync(absoluteBlogImgPath, Buffer.from(imgBuffer));
    } else {
      // Create an aesthetic gradient SVG cover matching Ember & Ink brand
      const svgCover = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#5B1F2A"/>
              <stop offset="1" stop-color="#2B2118"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="750" fill="url(#grad)"/>
          <text x="600" y="350" text-anchor="middle" font-family="Georgia, serif" font-size="72" fill="#FBF6EE">${cleanBookName}</text>
          <text x="600" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#C9A227" font-style="italic">by ${data.author}</text>
          <line x1="450" y1="480" x2="750" y2="480" stroke="#C9A227" stroke-width="2"/>
        </svg>`;
      fs.writeFileSync(absoluteBlogImgPath.replace('.jpg', '.svg'), svgCover);
      localCoverPath = `/images/blog/${slug}.svg`;
    }

    // 4. Create Markdown File
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

    // 5. Create Pinterest Text
    const pinDir = path.join(process.cwd(), 'pinterest', `${slug}`);
    if (!fs.existsSync(pinDir)) fs.mkdirSync(pinDir, { recursive: true });
    fs.writeFileSync(path.join(pinDir, 'pin-text.txt'), `TITLE:\n${data.pinTitle}\n\nDESCRIPTION:\n${data.pinDescription}\n\nHASHTAGS:\n${data.pinHashtags}\n\nLINK:\nhttps://ember-and-ink.sm-officialcreates.workers.dev/blog/${slug}/`);

    // 6. Render Pinterest Image via Puppeteer
    console.log('Rendering Pinterest image...');
    
    // Convert local cover to base64
    let bookBase64 = '';
    if (fs.existsSync(absoluteBlogImgPath)) {
       const ext = path.extname(absoluteBlogImgPath).replace('.', '');
       const mime = ext === 'png' ? 'image/png' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
       bookBase64 = `data:${mime};base64,${fs.readFileSync(absoluteBlogImgPath).toString('base64')}`;
    }

    // Generate Hand-drawn Stars SVG
    const starsSvg = data.summaryPoints.length > 0 ? `
      <svg width="200" height="50" viewBox="0 0 200 50">
        <path d="M 20 10 Q 25 20 35 20 Q 25 25 25 35 Q 30 25 40 25 Q 30 20 30 10 Q 25 20 20 10 Z" fill="none" stroke="#111" stroke-width="2"/>
        <path d="M 60 10 Q 65 20 75 20 Q 65 25 65 35 Q 70 25 80 25 Q 70 20 70 10 Q 65 20 60 10 Z" fill="none" stroke="#111" stroke-width="2"/>
        <path d="M 100 10 Q 105 20 115 20 Q 105 25 105 35 Q 110 25 120 25 Q 110 20 110 10 Q 105 20 100 10 Z" fill="none" stroke="#111" stroke-width="2"/>
        <path d="M 140 10 Q 145 20 155 20 Q 145 25 145 35 Q 150 25 160 25 Q 150 20 150 10 Q 145 20 140 10 Z" fill="none" stroke="#111" stroke-width="2"/>
        <path d="M 180 10 Q 185 20 195 20 Q 185 25 185 35 Q 190 25 200 25 Q 190 20 190 10 Q 185 20 180 10 Z" fill="none" stroke="#111" stroke-width="2"/>
      </svg>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Shadows+Into+Light&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; width: 1000px; height: 1500px; 
            background-color: #F8F6F0; 
            background-image: url('https://www.transparenttextures.com/patterns/cream-paper.png');
            font-family: 'Shadows Into Light', cursive; 
            overflow: hidden; position: relative; 
          }
          
          /* Hand-drawn stars */
          .stars-container { position: absolute; top: 70px; left: 50px; }
          .rating { font-family: 'Caveat', cursive; font-size: 65px; position: absolute; top: 120px; left: 80px; font-weight: bold; color: #111; transform: rotate(-5deg); }
          
          /* Title and Author */
          .title { font-family: 'Caveat', cursive; font-size: 65px; line-height: 1.1; position: absolute; top: 80px; right: 50px; width: 480px; color: #111; }
          .author { font-family: 'Caveat', cursive; font-size: 40px; position: absolute; top: 220px; right: 50px; color: #333; }
          
          /* Bullet points */
          .points { position: absolute; top: 300px; right: 40px; width: 460px; font-size: 36px; line-height: 1.3; color: #111; }
          .points div { margin-bottom: 20px; }
          
          /* Book Cover with 3D Shadow */
          .book-wrapper { 
            position: absolute; top: 550px; left: 150px; width: 420px; height: 630px; 
            box-shadow: 15px 25px 40px rgba(0,0,0,0.4); 
            transform: rotate(-4deg); 
            background: #fff; 
            border-radius: 4px 8px 8px 4px; 
            border-left: 12px solid #e0e0e0; /* Fake spine/pages */
          }
          .book-wrapper img, .book-wrapper svg { width: 100%; height: 100%; object-fit: cover; border-radius: 0 4px 4px 0; }
          
          /* Keywords */
          .keywords { position: absolute; bottom: 150px; right: 50px; width: 400px; font-size: 36px; text-align: right; line-height: 1.6; color: #111; }
          
          /* Hand-drawn Arrows */
          .arrow-1 { position: absolute; top: 850px; left: 80px; }
          .arrow-2 { position: absolute; top: 880px; right: 80px; transform: scaleX(-1); }
          
          /* Sticker */
          .cta-sticker { 
            position: absolute; bottom: 80px; left: 150px; 
            border: 3px dashed #111; padding: 15px 40px; 
            font-size: 40px; background: #fff; transform: rotate(-2deg); 
            font-family: 'Caveat', cursive; font-weight: bold;
            box-shadow: 2px 4px 10px rgba(0,0,0,0.1);
          }
          
          .footer { position: absolute; bottom: 30px; width: 100%; text-align: center; font-family: sans-serif; font-size: 16px; letter-spacing: 5px; color: #999; }
        </style>
      </head>
      <body>
        <div class="stars-container">${starsSvg}</div>
        <div class="rating">${data.rating}/5</div>
        
        <div class="title">${cleanBookName}</div>
        <div class="author">by ${data.author}</div>
        
        <div class="points">
          ${data.summaryPoints.map(p => `<div>- ${p}</div>`).join('')}
        </div>

        <div class="book-wrapper">
          ${bookBase64 ? `<img src="${bookBase64}" />` : `<div style="padding:20px; text-align:center; font-size:40px; margin-top:200px;">${cleanBookName}</div>`}
        </div>

        <!-- Hand-drawn Arrows -->
        <svg class="arrow-1" width="100" height="100" viewBox="0 0 100 100" fill="none">
          <path d="M10,90 Q40,90 60,40" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <polygon points="60,40 50,45 65,30" fill="#111"/>
        </svg>
        <svg class="arrow-2" width="100" height="100" viewBox="0 0 100 100" fill="none">
          <path d="M10,90 Q40,90 60,40" stroke="#111" stroke-width="4" stroke-linecap="round"/>
          <polygon points="60,40 50,45 65,30" fill="#111"/>
        </svg>

        <div class="keywords">
          ${data.keywords.map(k => `<div>${k}</div>`).join('')}
        </div>

        <div class="cta-sticker">${data.pinBottomCTA}</div>
        <div class="footer">EMBERANDINK.COM</div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready); // Force font load
    await page.screenshot({ path: path.join(pinDir, 'pin-image.png') });
    await browser.close();

    // 7. Cleanup
    fs.writeFileSync(BOOKS_FILE, books.slice(1).join('\n'));
    console.log(`Success! Generated beautiful assets for: ${cleanBookName}`);

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}
generate();
