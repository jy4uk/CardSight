import puppeteer from 'puppeteer';

// WARNING: Web scraping may violate TCGPlayer's Terms of Service
// Use at your own risk and consider their API when available

class TCGPlayerScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid bot detection
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Add delays to be respectful
    await this.page.setDefaultTimeout(30000);
  }

  async searchCard(cardName, setName) {
    try {
      // Navigate to TCGPlayer
      await this.page.goto('https://www.tcgplayer.com/', { waitUntil: 'networkidle0' });
      
      // Wait for search to be available
      await this.page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 });
      
      // Search for the card
      const searchInput = await this.page.$('[data-testid="search-input"]');
      await searchInput.type(cardName);
      
      // Wait for results
      await this.page.waitForTimeout(2000);
      
      // Click search
      await this.page.keyboard.press('Enter');
      
      // Wait for results to load
      await this.page.waitForTimeout(3000);
      
      // Get search results
      const results = await this.page.$$('[data-testid="product-card"]');
      
      if (results.length === 0) {
        return null;
      }
      
      // Find best match
      let bestMatch = null;
      for (const result of results) {
        const resultText = await result.textContent();
        if (resultText.toLowerCase().includes(setName.toLowerCase())) {
          bestMatch = result;
          break;
        }
      }
      
      if (!bestMatch) {
        bestMatch = results[0]; // Fallback to first result
      }
      
      // Click on the best match
      await bestMatch.click();
      
      // Wait for product page to load
      await this.page.waitForTimeout(3000);
      
      // Try to get pricing data
      const pricingData = await this.extractPricingData();
      
      return pricingData;
      
    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  }

  async extractPricingData() {
    try {
      // Look for pricing information
      const priceSelectors = [
        '[data-testid="market-price"]',
        '[data-testid="low-price"]',
        '[data-testid="mid-price"]',
        '[data-testid="high-price"]',
        '.price',
        '.price-value'
      ];
      
      const pricing = {};
      
      for (const selector of priceSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const text = await element.textContent();
            const price = this.parsePrice(text);
            if (price) {
              const priceType = selector.includes('market') ? 'market' :
                              selector.includes('low') ? 'low' :
                              selector.includes('mid') ? 'mid' :
                              selector.includes('high') ? 'high' : 'market';
              pricing[priceType] = price;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      return Object.keys(pricing).length > 0 ? pricing : null;
      
    } catch (error) {
      console.error('Error extracting pricing:', error);
      return null;
    }
  }

  parsePrice(text) {
    // Extract price from text like "$25.99" or "25.99"
    const match = text.match(/\$?(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default TCGPlayerScraper;
