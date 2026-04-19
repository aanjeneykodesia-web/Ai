// AI Data Scraper Engine
class AIScraper {
    constructor() {
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        // Alternative proxies you can use:
        // 'https://corsproxy.io/?' +
        // 'https://thingproxy.freeboard.io/fetch/' +
    }

    async scrapeWebsite(url, instructions) {
        try {
            // Fetch page content through CORS proxy
            const html = await this.fetchPageContent(url);
            
            // Analyze page structure
            const pageInfo = this.analyzePage(html);
            
            // Use AI-like extraction (regex + heuristics + structure detection)
            const extractedData = this.extractData(html, instructions, pageInfo);
            
            return {
                success: true,
                url: url,
                timestamp: new Date().toISOString(),
                pageInfo: pageInfo,
                data: extractedData,
                stats: {
                    totalElements: extractedData.length || 0,
                    extractionTime: Date.now()
                }
            };
            
        } catch (error) {
            throw new Error(`Scraping failed: ${error.message}`);
        }
    }

    async fetchPageContent(url) {
        const proxyUrl = `${this.corsProxy}${encodeURIComponent(url)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
    }

    analyzePage(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        return {
            title: doc.title?.substring(0, 100) || 'No title',
            headings: Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => h.textContent.trim().substring(0, 50)),
            links: doc.querySelectorAll('a[href]').length,
            images: doc.querySelectorAll('img').length,
            lists: doc.querySelectorAll('ul, ol').length,
            tables: doc.querySelectorAll('table').length
        };
    }

    extractData(html, instructions, pageInfo) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Smart extraction patterns
        const extractors = {
            products: this.extractProducts(doc),
            articles: this.extractArticles(doc),
            quotes: this.extractQuotes(doc),
            links: Array.from(doc.querySelectorAll('a[href]')).map(a => ({
                text: a.textContent.trim(),
                href: a.href
            })).slice(0, 20),
            prices: this.extractPrices(html),
            emails: this.extractEmails(html)
        };
        
        // Parse instructions to determine extraction type
        const instructionType = this.parseInstructions(instructions);
        
        return extractors[instructionType] || extractors.products || [];
    }

    parseInstructions(instructions) {
        const lower = instructions.toLowerCase();
        if (lower.includes('product') || lower.includes('price')) return 'products';
        if (lower.includes('article') || lower.includes('title')) return 'articles';
        if (lower.includes('quote')) return 'quotes';
        if (lower.includes('email')) return 'emails';
        return 'products'; // default
    }
