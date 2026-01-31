import { DatabaseService } from './database-service.js';
import { Product, Price, Group } from './api-models.js';

export class ParallelDatabaseService {
  private dbService: DatabaseService;
  private numWorkers: number;

  constructor(numWorkers: number = 4) {
    this.dbService = new DatabaseService();
    this.numWorkers = numWorkers;
  }

  async insertProductsParallel(products: Product[]): Promise<void> {
    console.log(`Processing ${products.length} products with ${this.numWorkers} parallel workers...`);
    
    const chunkSize = Math.ceil(products.length / this.numWorkers);
    const chunks: Product[][] = [];
    
    for (let i = 0; i < products.length; i += chunkSize) {
      chunks.push(products.slice(i, i + chunkSize));
    }

    const promises = chunks.map((chunk, index) => 
      this.processProductChunk(chunk, index)
    );

    const results = await Promise.all(promises);
    
    let totalNew = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Worker ${index} error:`, result.error);
        totalErrors++;
      } else {
        totalNew += result.newCount;
        totalUpdated += result.updateCount;
        totalUnchanged += result.unchangedCount;
      }
    });

    console.log(`Products processing complete: ${totalNew} new, ${totalUpdated} updated, ${totalUnchanged} unchanged, ${totalErrors} errors`);
  }

  async insertGroupsParallel(groups: Group[]): Promise<void> {
    console.log(`Processing ${groups.length} groups with ${this.numWorkers} parallel workers...`);
    
    const chunkSize = Math.ceil(groups.length / this.numWorkers);
    const chunks: Group[][] = [];
    
    for (let i = 0; i < groups.length; i += chunkSize) {
      chunks.push(groups.slice(i, i + chunkSize));
    }

    const promises = chunks.map((chunk, index) => 
      this.processGroupChunk(chunk, index)
    );

    const results = await Promise.all(promises);
    
    let totalNew = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Worker ${index} error:`, result.error);
        totalErrors++;
      } else {
        totalNew += result.newCount;
        totalUpdated += result.updateCount;
        totalUnchanged += result.unchangedCount;
      }
    });

    console.log(`Groups processing complete: ${totalNew} new, ${totalUpdated} updated, ${totalUnchanged} unchanged, ${totalErrors} errors`);
  }

  async insertPricesParallel(prices: Price[]): Promise<void> {
    console.log(`Processing ${prices.length} prices with ${this.numWorkers} parallel workers...`);
    
    const chunkSize = Math.ceil(prices.length / this.numWorkers);
    const chunks: Price[][] = [];
    
    for (let i = 0; i < prices.length; i += chunkSize) {
      chunks.push(prices.slice(i, i + chunkSize));
    }

    const promises = chunks.map((chunk, index) => 
      this.processPriceChunk(chunk, index)
    );

    const results = await Promise.all(promises);
    
    let totalProcessed = 0;
    let totalErrors = 0;

    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Worker ${index} error:`, result.error);
        totalErrors++;
      } else {
        totalProcessed += result.processedCount;
      }
    });

    console.log(`Prices processing complete: ${totalProcessed} processed, ${totalErrors} errors`);
  }

  private async processProductChunk(products: Product[], workerIndex: number): Promise<{ newCount: number; updateCount: number; unchangedCount: number; error?: string }> {
    const dbService = new DatabaseService();
    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    try {
      for (const product of products) {
        const existingProduct = await dbService.getProductById(product.productId);
        
        if (!existingProduct) {
          newCount++;
        } else if (dbService.hasProductChanges(existingProduct, product)) {
          updateCount++;
        } else {
          unchangedCount++;
        }
        
        await dbService.insertProduct(product);
      }
    } catch (error) {
      return {
        newCount: 0,
        updateCount: 0,
        unchangedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return { newCount, updateCount, unchangedCount };
  }

  private async processGroupChunk(groups: Group[], workerIndex: number): Promise<{ newCount: number; updateCount: number; unchangedCount: number; error?: string }> {
    const dbService = new DatabaseService();
    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;

    try {
      for (const group of groups) {
        const existingGroup = await dbService.getGroupById(group.groupId);
        
        if (!existingGroup) {
          newCount++;
        } else if (dbService.hasGroupChanges(existingGroup, group)) {
          updateCount++;
        } else {
          unchangedCount++;
        }
        
        await dbService.insertGroup(group);
      }
    } catch (error) {
      return {
        newCount: 0,
        updateCount: 0,
        unchangedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return { newCount, updateCount, unchangedCount };
  }

  private async processPriceChunk(prices: Price[], workerIndex: number): Promise<{ processedCount: number; error?: string }> {
    const dbService = new DatabaseService();
    let processedCount = 0;

    try {
      for (const price of prices) {
        await dbService.insertPrice(price);
        processedCount++;
      }
    } catch (error) {
      return {
        processedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return { processedCount };
  }

  async setupDatabase(): Promise<void> {
    await this.dbService.setupTables();
  }

  async getDatabaseStats() {
    return {
      groups: await this.dbService.getGroupCount(),
      products: await this.dbService.getProductCount(),
      prices: await this.dbService.getPriceCount()
    };
  }
}
