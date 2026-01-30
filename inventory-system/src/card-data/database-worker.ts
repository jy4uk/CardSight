import { parentPort } from 'worker_threads';
import { DatabaseService } from './database-service.js';
import { Product, Price, Group } from './api-models.js';

interface WorkerMessage {
  type: 'process_products' | 'process_groups' | 'process_prices';
  data: Product[] | Group[] | Price[];
  workerIndex: number;
}

async function processProducts(products: Product[]): Promise<{ newCount: number; updateCount: number; unchangedCount: number }> {
  const dbService = new DatabaseService();
  let newCount = 0;
  let updateCount = 0;
  let unchangedCount = 0;

  for (const product of products) {
    try {
      const existingProduct = await dbService.getProductById(product.productId);
      
      if (!existingProduct) {
        newCount++;
      } else if (dbService.hasProductChanges(existingProduct, product)) {
        updateCount++;
      } else {
        console.log('Product unchanged:', product.productId);
        unchangedCount++;
      }
      
      await dbService.insertProduct(product);
    } catch (error) {
      console.error(`Worker failed to process product ${product.productId}:`, error);
      throw error;
    }
  }

  return { newCount, updateCount, unchangedCount };
}

async function processGroups(groups: Group[]): Promise<{ newCount: number; updateCount: number; unchangedCount: number }> {
  const dbService = new DatabaseService();
  let newCount = 0;
  let updateCount = 0;
  let unchangedCount = 0;

  for (const group of groups) {
    try {
      const existingGroup = await dbService.getGroupById(group.groupId);
      
      if (!existingGroup) {
        newCount++;
      } else if (dbService.hasGroupChanges(existingGroup, group)) {
        updateCount++;
      } else {
        console.log('Group unchanged:', group.groupId);
        unchangedCount++;
      }
      
      await dbService.insertGroup(group);
    } catch (error) {
      console.error(`Worker failed to process group ${group.groupId}:`, error);
      throw error;
    }
  }

  return { newCount, updateCount, unchangedCount };
}

async function processPrices(prices: Price[]): Promise<{ processedCount: number }> {
  const dbService = new DatabaseService();
  let processedCount = 0;

  for (const price of prices) {
    try {
      await dbService.insertPrice(price);
      processedCount++;
    } catch (error) {
      console.error(`Worker failed to process price for product ${price.productId}:`, error);
      throw error;
    }
  }

  return { processedCount };
}

async function main() {
  if (!parentPort) {
    throw new Error('This script must be run as a worker thread');
  }

  parentPort.on('message', async (message: WorkerMessage) => {
    try {
      let result;

      switch (message.type) {
        case 'process_products':
          result = await processProducts(message.data as Product[]);
          break;
        case 'process_groups':
          result = await processGroups(message.data as Group[]);
          break;
        case 'process_prices':
          const priceResult = await processPrices(message.data as Price[]);
          result = {
            newCount: priceResult.processedCount,
            updateCount: 0,
            unchangedCount: 0
          };
          break;
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      parentPort!.postMessage({
        type: message.type,
        ...result
      });

    } catch (error) {
      parentPort!.postMessage({
        type: message.type,
        newCount: 0,
        updateCount: 0,
        unchangedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

main().catch(error => {
  console.error('Worker error:', error);
  process.exit(1);
});
