document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('url');
    const instructionsInput = document.getElementById('instructions');
    const scrapeBtn = document.getElementById('scrapeBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorSection = document.getElementById('error');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Example URLs for quick testing
    const exampleUrls = [
        'https://example.com',
        'https://news.ycombinator.com',
        'https://quotes.toscrape.com'
    ];

    scrapeBtn.addEventListener('click', async function() {
        const url = urlInput.value.trim();
        const instructions = instructionsInput.value.trim();

        if (!url || !instructions) {
            showError('Please enter both URL and scraping instructions');
            return;
        }

        if (!isValidUrl(url)) {
            showError('Please enter a valid URL');
            return;
        }

        hideAllSections();
        loading.style.display = 'block';
        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping...';

        try {
            const scrapedData = await scrapeWebsite(url, instructions);
            displayResults(scrapedData);
        } catch (error) {
            showError(error.message);
        } finally {
            loading.style.display = 'none';
            scrapeBtn.disabled = false;
            scrapeBtn.innerHTML = '<i class="fas fa-magic"></i> Start Scraping';
        }
    });

    copyBtn.addEventListener('click', function() {
        const data = jsonOutput.querySelector('code').textContent;
        navigator.clipboard.writeText(data).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    });

    downloadBtn.addEventListener('click', function() {
        const data = jsonOutput.querySelector('code').textContent;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    clearBtn.addEventListener('click', function() {
        hideAllSections();
        urlInput.value = '';
        instructionsInput.value = `Extract the following data as JSON:
{
  "products": [
    {
      "name": "",
      "price": "",
      "description": "",
      "url": ""
    }
  ]
}`;
    });

    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            scrapeBtn.click();
        }
    });

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function hideAllSections() {
        results.style.display = 'none';
        errorSection.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
    }

    function displayResults(data) {
        jsonOutput.querySelector('code').textContent = JSON.stringify(data, null, 2);
        results.style.display = 'block';
    }

    // Add example button
    const urlInputGroup = urlInput.parentElement;
    const exampleBtn = document.createElement('button');
    exampleBtn.className = 'example-btn';
    exampleBtn.innerHTML = '<i class="fas fa-th"></i> Examples';
    exampleBtn.onclick = () => {
        const randomUrl = exampleUrls[Math.floor(Math.random() * exampleUrls.length)];
        urlInput.value = randomUrl;
    };
    urlInputGroup.appendChild(exampleBtn);
});
