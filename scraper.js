// AI Data Scraper Engine - Fixed with Multiple Proxies
class AIScraper {
    constructor() {
        // Multiple working CORS proxies (2024)
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
    }

    async scrapeWebsite(url, instructions) {
        try {
            console.log('🔍 Starting scrape for:', url);
            
            // Try direct fetch first (works for same-origin or CORS-enabled sites)
            let html;
            try {
                html = await this.fetchDirect(url);
                console.log('✅ Direct fetch successful');
            } catch (directError) {
                console.log('⚠️ Direct fetch failed, trying proxies...');
                html = await this.fetchWithProxies(url);
            }
            
            // Analyze and extract
            const pageInfo = this.analyzePage(html);
            const extractedData = this.extractData(html, instructions, pageInfo);
            
            return {
                success: true,
                url: url,
                timestamp: new Date().toISOString(),
                pageInfo: pageInfo,
                rawHtmlLength: html.length,
                data: extractedData,
                stats: {
                    totalElements: Array.isArray(extractedData) ? extractedData.length : 1,
                    extractionTime: Date.now()
                }
            };
            
        } catch (error) {
            console.error('❌ Scraping error:', error);
            throw new Error(`Scraping failed: ${error.message}`);
        }
    }

    async fetchDirect(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.text();
    }

    async fetchWithProxies(url) {
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxyUrl = `${this.corsProxies[i]}${encodeURIComponent(url)}`;
            console.log(`Trying proxy ${i + 1}/${this.corsProxies.length}:`, proxyUrl);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(proxyUrl, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const html = await response.text();
                    if (html && html.length > 100) { // Valid HTML check
                        console.log('✅ Proxy successful');
                        return html;
                    }
                }
            } catch (proxyError) {
                console.log(`❌ Proxy ${i + 1} failed:`, proxyError.message);
            }
        }
        
        throw new Error('All proxies failed. Try a different URL.');
    }

    analyzePage(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            return {
                title: doc.title?.substring(0, 100) || 'No title',
                description: doc.querySelector('meta[name="description"]')?.content?.substring(0, 200) || '',
                headings: Array.from(doc.querySelectorAll('h1,h2,h3')).slice(0, 5).map(h => h.textContent.trim().substring(0, 50)),
                links: Math.min(doc.querySelectorAll('a[href]').length, 999),
                images: Math.min(doc.querySelectorAll('img').length, 999)
            };
        } catch (e) {
            return { error: 'Could not parse HTML' };
        }
    }

    extractData(html, instructions, pageInfo) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Intelligent extraction based on common patterns
            const results = {
                pageInfo: pageInfo,
                extracted: []
            };

            // Extract products/e-commerce items
            const products = this.extractProducts(doc);
            if (products.length > 0) {
                results.products = products;
                results.extracted.push(...products);
            }

            // Extract articles/posts
            const articles = this.extractArticles(doc);
            if (articles.length > 0) {
                results.articles = articles;
                results.extracted.push(...articles);
            }

            // Extract quotes/testimonials
            const quotes = this.extractQuotes(doc);
            if (quotes.length > 0) {
                results.quotes = quotes;
                results.extracted.push(...quotes);
            }

            // Extract links
            const links = Array.from(doc.querySelectorAll('a[href]'))
                .slice(0, 20)
                .map(a => ({
                    text: a.textContent.trim().substring(0, 100),
                    href: a.href,
                    target: a.target || ''
                }));
            results.links = links;

            // Extract prices
            const prices = this.extractPrices(html);
            if (prices.length > 0) {
                results.prices = prices;
            }

            // If no specific data found, return page summary
            if (results.extracted.length === 0) {
                results.summary = {
                    title: pageInfo.title,
                    url: pageInfo.url || '',
                    contentPreview: this.getTextPreview(doc)
                };
            }

            return results;
        } catch (e) {
            return { error: 'Extraction failed', rawHtmlPreview: html.substring(0, 500) };
        }
    }

    extractProducts(doc) {
        const products = [];
        
        // Common product selectors
        const selectors = [
            '.product', '.item', '[data-product]', '.woocommerce-loop-product',
            '.grid-item', '.card', '.product-card', '.shop-item'
        ];
        
        selectors.forEach(selector => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => {
                const name = el.querySelector('h3, h2, .title, .name')?.textContent?.trim();
                const price = el.querySelector('.price, .cost, [data-price]')?.textContent?.trim();
                const link = el.querySelector('a')?.href;
                const img = el.querySelector('img')?.src;
                
                if (name || price) {
                    products.push({
                        name: name || 'N/A',
                        price: price || 'N/A',
                        url: link || '',
                        image: img || ''
                    });
                }
            });
        });
        
        return products.slice(0, 50);
    }

    extractArticles(doc) {
        const articles = [];
        const selectors = ['article', '.post', '.blog-post', '.entry'];
        
        selectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(el => {
                const title = el.querySelector('h1,h2,h3')?.textContent?.trim();
                const excerpt = el.textContent?.substring(0, 200).trim();
                const link = el.querySelector('a')?.href;
                
                if (title) {
                    articles.push({ title, excerpt, url: link || '' });
                }
            });
        });
        
        return articles.slice(0, 20);
    }

    extractQuotes(doc) {
        const quotes = [];
        doc.querySelectorAll('.quote, blockquote, [class*="testimonial"]').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 20) {
                quotes.push({ quote: text.substring(0, 300) });
            }
        });
        return quotes.slice(0, 10);
    }

    extractPrices(html) {
        const priceRegex = /\$?[\d,]+\.?\d*\s*(USD|EUR|GBP)?|[\d,]+\.?\d*\s*€|[\d,]+\.?\d*\s*£/gi;
        const matches = html.match(priceRegex) || [];
        return [...new Set(matches)].slice(0, 50);
    }

    getTextPreview(doc) {
        let text = doc.body?.textContent || '';
        return text.substring(0, 500).trim() + (text.length > 500 ? '...' : '');
    }
}

// Global scraper instance
const scraper = new AIScraper();

// Export for script.js
window.scrapeWebsite = async (url, instructions) => {
    return await scraper.scrapeWebsite(url, instructions);
};
