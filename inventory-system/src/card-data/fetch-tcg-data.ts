import {
  GroupsResponse,
  ProductsResponse,
  PricesResponse,
  Group,
  Product,
  Price
} from './api-models.ts';
import { ParallelDatabaseService } from './parallel-database-service.js';
import { CATEGORY_CONFIG } from './category-config.js';

const BASE_URL = 'https://tcgcsv.com/tcgplayer';
const CATEGORY_IDS = CATEGORY_CONFIG.DEFAULT_CATEGORY_IDS; // Pokemon and One Piece

class TCGDataFetcher {
  private delay: number = 0; // 0 second delay between requests to avoid rate limiting
  private dbService: ParallelDatabaseService;

  constructor() {
    this.dbService = new ParallelDatabaseService(4); // Use 4 workers
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(url: string, maxRetries: number = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching: ${url} (attempt ${attempt})`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(`API error: ${data.errors?.join(', ') || 'Unknown error'}`);
        }
        
        return data;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const backoffDelay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoffDelay}ms...`);
        await this.sleep(backoffDelay);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  async fetchGroups(categoryIds: number[] = CATEGORY_IDS): Promise<Group[]> {
    const allGroups: Group[] = [];
    
    for (const categoryId of categoryIds) {
      const url = `${BASE_URL}/${categoryId}/groups`;
      console.log(`Fetching groups for category ${categoryId}...`);
      
      const response = await this.fetchWithRetry<GroupsResponse>(url);
      console.log(`Found ${response.results.length} groups for category ${categoryId}`);
      
      allGroups.push(...response.results);
      
      // Add delay between category requests
      if (categoryIds.indexOf(categoryId) < categoryIds.length - 1) {
        await this.sleep(this.delay);
      }
    }
    
    console.log(`Total groups found across all categories: ${allGroups.length}`);
    return allGroups;
  }

  async fetchProducts(categoryId: number, groupId: number): Promise<Product[]> {
    const url = `${BASE_URL}/${categoryId}/${groupId}/products`;
    console.log(`Fetching products for category ${categoryId}, group ${groupId}...`);
    
    const response = await this.fetchWithRetry<ProductsResponse>(url);
    console.log(`Found ${response.results.length} products for group ${groupId}`);
    
    return response.results;
  }

  async fetchPrices(categoryId: number, groupId: number): Promise<Price[]> {
    const url = `${BASE_URL}/${categoryId}/${groupId}/prices`;
    console.log(`Fetching prices for category ${categoryId}, group ${groupId}...`);
    
    const response = await this.fetchWithRetry<PricesResponse>(url);
    console.log(`Found ${response.results.length} price entries for group ${groupId}`);
    
    return response.results;
  }

  async fetchAllGroupData(categoryIds: number[] = CATEGORY_IDS): Promise<{
    groups: Group[];
    products: Product[];
    prices: Price[];
  }> {
    console.log('Starting data fetch process...');
    console.log(`Fetching data for categories: ${categoryIds.join(', ')}`);
    
    // Step 1: Fetch all groups from all categories
    const groups = await this.fetchGroups(categoryIds);
    
    const allProducts: Product[] = [];
    const allPrices: Price[] = [];
    
    // Step 2: Fetch products and prices for each group
    // Groups already contain their category ID, so we use that
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      console.log(`\nProcessing group ${i + 1}/${groups.length}: ${group.name} (ID: ${group.groupId}, Category: ${group.categoryId})`);
      
      try {
        // Fetch products using the group's category ID
        const products = await this.fetchProducts(group.categoryId, group.groupId);
        allProducts.push(...products);
        
        // Add delay between requests
        await this.sleep(this.delay);
        
        // Fetch prices using the group's category ID
        const prices = await this.fetchPrices(group.categoryId, group.groupId);
        allPrices.push(...prices);
        
        // Add delay before next group
        if (i < groups.length - 1) {
          await this.sleep(this.delay);
        }
        
      } catch (error) {
        console.error(`Failed to fetch data for group ${group.groupId} (${group.name}):`, error);
        // Continue with next group even if one fails
        continue;
      }
    }
    
    console.log('\n=== Fetch Complete ===');
    console.log(`Total groups processed: ${groups.length}`);
    console.log(`Total products fetched: ${allProducts.length}`);
    console.log(`Total price entries fetched: ${allPrices.length}`);
    
    return {
      groups,
      products: allProducts,
      prices: allPrices
    };
  }

  async setupDatabase(): Promise<void> {
    await this.dbService.setupDatabase();
  }

  async clearDatabase(): Promise<void> {
    // Clearing not implemented in parallel service yet
    console.log('Clear database not implemented in parallel service');
  }

  async saveDataToFile(data: any, filename: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`Data saved to ${filename}`);
    } catch (error) {
      console.error(`Failed to save data to ${filename}:`, error);
    }
  }

  async saveGroupsToDatabase(groups: Group[]): Promise<void> {
    await this.dbService.insertGroupsParallel(groups);
  }

  async saveProductsToDatabase(products: Product[]): Promise<void> {
    await this.dbService.insertProductsParallel(products);
  }

  async savePricesToDatabase(prices: Price[]): Promise<void> {
    await this.dbService.insertPricesParallel(prices);
  }

  async getDatabaseStats(): Promise<{ products: number; prices: number; groups: number }> {
    return await this.dbService.getDatabaseStats();
  }
}

// Main execution function
async function main() {
  const fetcher = new TCGDataFetcher();
  
  try {
    const startTime = Date.now();
    
    // Setup database
    console.log('Setting up database...');
    await fetcher.setupDatabase();
    
    // Fetch all data (incremental update - no table clearing)
    console.log('Fetching latest data from TCGCSV...');
    const data = await fetcher.fetchAllGroupData();
    
    // Save data to database
    console.log('\nSaving data to database...');
    await fetcher.saveGroupsToDatabase(data.groups);
    await fetcher.saveProductsToDatabase(data.products);
    await fetcher.savePricesToDatabase(data.prices);
    
    // Get final stats
    const stats = await fetcher.getDatabaseStats();
    console.log(`\n=== Database Update Complete ===`);
    console.log(`Total groups in database: ${stats.groups}`);
    console.log(`Total products in database: ${stats.products}`);
    console.log(`Total price entries in database: ${stats.prices}`);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\nTotal execution time: ${duration.toFixed(2)} seconds`);
    
  } catch (error) {
    console.error('Fatal error during data fetch:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
// if (require.main === module) {
  main();
// }

export { TCGDataFetcher };
