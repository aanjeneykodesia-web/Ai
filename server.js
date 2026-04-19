const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Data Extraction API
app.post('/api/scrape', async (req, res) => {
    const { url, instructions } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`🕷️ Scraping: ${url}`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Navigate and wait for content
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Get page content
        const content = await page.evaluate(() => {
            return {
                title: document.title,
                html: document.documentElement.outerHTML.substring(0, 50000), // Limit size
                text: document.body.innerText.substring(0, 10000),
                links: Array.from(document.querySelectorAll('a')).map(a => ({
                    text: a.innerText.trim(),
                    href: a.href
                })).slice(0, 50)
            };
        });
        
        await browser.close();
        
        // AI-like extraction
        const extracted = extractData(content, instructions);
        
        res.json({
            success: true,
            url,
            timestamp: new Date().toISOString(),
            content: content,
            data: extracted
        });
        
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: error.message });
    }
});

function extractData(content, instructions) {
    const { html, text, links } = content;
    
    // Smart extraction patterns
    const results = {
        pageInfo: {
            title: content.title,
            url: content.url || '',
            wordCount: text.split(' ').length
        },
        extracted: []
    };

    // Products
    const productMatches = html.match(/<[^>]*class=["'][^"']*(product|item|card|shop)[^"']*["'][^>]*>/gi) || [];
    results.products = productMatches.slice(0, 10).map((match, i) => ({
        id: i + 1,
        selector: match.substring(0, 100) + '...',
        preview: extractTextFromHtml(match)
    }));

    // Prices
    const prices = text.match(/\$[\d,]+\.?\d*|\€[\d,]+\.?\d*|£[\d,]+\.?\d*/gi) || [];
    results.prices = [...new Set(prices)].slice(0, 20);

    // Emails
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi) || [];
    results.emails = [...new Set(emails)];

    // Links
    results.links = links.slice(0, 20);

    // Text summary
    results.summary = text.substring(0, 1000).trim() + (text.length > 1000 ? '...' : '');

    return results;
}

function extractTextFromHtml(htmlSnippet) {
    const temp = document.createElement('div');
    temp.innerHTML = htmlSnippet;
    return temp.textContent?.substring(0, 200).trim() || '';
}

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 AI Scraper running at http://localhost:${PORT}`);
    console.log(`📱 Open in browser: http://localhost:${PORT}`);
});
