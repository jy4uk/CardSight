import { query } from '../services/db.js';
import { Product, Price, Group } from './api-models.js';
import { ProductDB, PriceDB, GroupDB } from './db_models.js';

export class DatabaseService {
  async setupTables(): Promise<void> {
    try {
      console.log('Setting up database tables...');
      
      // Read and execute the entire SQL file as a single transaction
      const fs = await import('fs/promises');
      const sql = await fs.readFile(new URL('./database-setup.sql', import.meta.url), 'utf8');
      
      console.log('Executing SQL setup script...');
      
      // Execute the entire SQL file at once
      await query(sql);
      
      console.log('Database tables setup complete');
    } catch (error) {
      console.error('Error setting up database tables:', error);
      throw error;
    }
  }

  async insertProduct(product: Product): Promise<void> {
    // Update image URL format before processing
    product.imageUrl = product.imageUrl.replace('_200w.jpg', '_in_1000x1000.jpg');
    
    // Check if product exists and compare for changes
    const existingProduct = await this.getProductById(product.productId);
    
    if (existingProduct) {
      // Compare fields to see if update is needed
      const hasChanges = this.hasProductChanges(existingProduct, product);
      
      if (!hasChanges) {
        // No changes, skip update
        return;
      }
      
      // Product exists and has changes, update it
      const sql = `
        UPDATE "card-data-products-tcgcsv" SET
          name = $2,
          clean_name = $3,
          image_url = $4,
          category_id = $5,
          group_id = $6,
          url = $7,
          modified_on = $8,
          image_count = $9,
          presale_is_presale = $10,
          presale_released_on = $11,
          presale_note = $12,
          extended_data = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $1
      `;

      const params = [
        product.productId,
        product.name,
        product.cleanName,
        product.imageUrl,
        product.categoryId,
        product.groupId,
        product.url,
        product.modifiedOn,
        product.imageCount,
        product.presaleInfo.isPresale,
        product.presaleInfo.releasedOn,
        product.presaleInfo.note,
        JSON.stringify(product.extendedData)
      ];

      try {
        await query(sql, params);
        console.log(`Updated product ${product.productId} (${product.name})`);
      } catch (error) {
        console.error(`Error updating product ${product.productId}:`, error);
        throw error;
      }
    } else {
      // Product doesn't exist, insert it
      const sql = `
        INSERT INTO "card-data-products-tcgcsv" (
          product_id, name, clean_name, image_url, category_id, group_id, 
          url, modified_on, image_count, presale_is_presale, 
          presale_released_on, presale_note, extended_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
      `;

      const params = [
        product.productId,
        product.name,
        product.cleanName,
        product.imageUrl,
        product.categoryId,
        product.groupId,
        product.url,
        product.modifiedOn,
        product.imageCount,
        product.presaleInfo.isPresale,
        product.presaleInfo.releasedOn,
        product.presaleInfo.note,
        JSON.stringify(product.extendedData)
      ];

      try {
        await query(sql, params);
        console.log(`Inserted new product ${product.productId} (${product.name})`);
      } catch (error) {
        console.error(`Error inserting product ${product.productId}:`, error);
        throw error;
      }
    }
  }

  async getProductById(productId: number): Promise<ProductDB | null> {
    const result = await query(
      'SELECT * FROM "card-data-products-tcgcsv" WHERE product_id = $1',
      [productId]
    );
    return result.length > 0 ? result[0] as ProductDB : null;
  }

  hasProductChanges(existing: ProductDB, incoming: Product): boolean {
    return (
      existing.name !== incoming.name ||
      existing.clean_name !== incoming.cleanName ||
      existing.image_url !== incoming.imageUrl ||
      existing.category_id !== incoming.categoryId ||
      existing.group_id !== incoming.groupId ||
      existing.url !== incoming.url ||
      new Date(existing.modified_on).toISOString() !== new Date(incoming.modifiedOn).toISOString() ||
      existing.image_count !== incoming.imageCount ||
      existing.presale_is_presale !== incoming.presaleInfo.isPresale ||
      (existing.presale_released_on ? new Date(existing.presale_released_on).toISOString() : null) !== (incoming.presaleInfo.releasedOn ? new Date(incoming.presaleInfo.releasedOn).toISOString() : null) ||
      existing.presale_note !== incoming.presaleInfo.note ||
      JSON.stringify(existing.extended_data) !== JSON.stringify(incoming.extendedData)
    );
  }

  async insertProducts(products: Product[]): Promise<void> {
    console.log(`Processing ${products.length} products...`);
    
    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;
    
    for (const product of products) {
      try {
        const existingProduct = await this.getProductById(product.productId);
        
        if (!existingProduct) {
          newCount++;
        } else if (this.hasProductChanges(existingProduct, product)) {
          updateCount++;
        } else {
          unchangedCount++;
        }
        
        await this.insertProduct(product);
      } catch (error) {
        console.error(`Failed to process product ${product.productId}, continuing...`);
        // Continue with next product even if one fails
      }
    }
    
    console.log(`Products processing complete: ${newCount} new, ${updateCount} updated, ${unchangedCount} unchanged`);
  }

  async insertPrice(price: Price): Promise<void> {
    const sql = `
      INSERT INTO "card-data-prices-tcgcsv" (
        product_id, low_price, mid_price, high_price, market_price, 
        direct_low_price, sub_type_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (product_id, sub_type_name) DO UPDATE SET
        low_price = EXCLUDED.low_price,
        mid_price = EXCLUDED.mid_price,
        high_price = EXCLUDED.high_price,
        market_price = EXCLUDED.market_price,
        direct_low_price = EXCLUDED.direct_low_price,
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      price.productId,
      price.lowPrice,
      price.midPrice,
      price.highPrice,
      price.marketPrice,
      price.directLowPrice,
      price.subTypeName
    ];

    try {
      await query(sql, params);
    } catch (error) {
      console.error(`Error inserting price for product ${price.productId}:`, error);
      throw error;
    }
  }

  async insertPrices(prices: Price[]): Promise<void> {
    console.log(`Inserting ${prices.length} price entries...`);
    
    for (const price of prices) {
      try {
        await this.insertPrice(price);
      } catch (error) {
        console.error(`Failed to insert price for product ${price.productId}, continuing...`);
        // Continue with next price even if one fails
      }
    }
    
    console.log('Prices insertion complete');
  }

  async getProductCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM "card-data-products-tcgcsv"');
    return parseInt(result[0].count);
  }

  async getPriceCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM "card-data-prices-tcgcsv"');
    return parseInt(result[0].count);
  }

  async insertGroup(group: Group): Promise<void> {
    // Check if group exists and compare for changes
    const existingGroup = await this.getGroupById(group.groupId);
    
    if (existingGroup) {
      // Compare fields to see if update is needed
      const hasChanges = this.hasGroupChanges(existingGroup, group);
      
      if (!hasChanges) {
        // No changes, skip update
        return;
      }
      
      // Group exists and has changes, update it
      const sql = `
        UPDATE "card-data-groups-tcgcsv" SET
          name = $2,
          abbreviation = $3,
          is_supplemental = $4,
          published_on = $5,
          modified_on = $6,
          category_id = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE group_id = $1
      `;

      const params = [
        group.groupId,
        group.name,
        group.abbreviation,
        group.isSupplemental,
        group.publishedOn,
        group.modifiedOn,
        group.categoryId
      ];

      try {
        await query(sql, params);
        console.log(`Updated group ${group.groupId} (${group.name})`);
      } catch (error) {
        console.error(`Error updating group ${group.groupId}:`, error);
        throw error;
      }
    } else {
      // Group doesn't exist, insert it
      const sql = `
        INSERT INTO "card-data-groups-tcgcsv" (
          group_id, name, abbreviation, is_supplemental, published_on, 
          modified_on, category_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const params = [
        group.groupId,
        group.name,
        group.abbreviation,
        group.isSupplemental,
        group.publishedOn,
        group.modifiedOn,
        group.categoryId
      ];

      try {
        await query(sql, params);
        console.log(`Inserted new group ${group.groupId} (${group.name})`);
      } catch (error) {
        console.error(`Error inserting group ${group.groupId}:`, error);
        throw error;
      }
    }
  }

  async getGroupById(groupId: number): Promise<GroupDB | null> {
    const result = await query(
      'SELECT * FROM "card-data-groups-tcgcsv" WHERE group_id = $1',
      [groupId]
    );
    return result.length > 0 ? result[0] as GroupDB : null;
  }

  hasGroupChanges(existing: GroupDB, incoming: Group): boolean {
    return (
      existing.name !== incoming.name ||
      existing.abbreviation !== incoming.abbreviation ||
      existing.is_supplemental !== incoming.isSupplemental ||
      new Date(existing.published_on).toISOString() !== new Date(incoming.publishedOn).toISOString() ||
      new Date(existing.modified_on).toISOString() !== new Date(incoming.modifiedOn).toISOString() ||
      existing.category_id !== incoming.categoryId
    );
  }

  async insertGroups(groups: Group[]): Promise<void> {
    console.log(`Processing ${groups.length} groups...`);
    
    let newCount = 0;
    let updateCount = 0;
    let unchangedCount = 0;
    
    for (const group of groups) {
      try {
        const existingGroup = await this.getGroupById(group.groupId);
        
        if (!existingGroup) {
          newCount++;
        } else if (this.hasGroupChanges(existingGroup, group)) {
          updateCount++;
        } else {
          unchangedCount++;
        }
        
        await this.insertGroup(group);
      } catch (error) {
        console.error(`Failed to process group ${group.groupId}, continuing...`);
        // Continue with next group even if one fails
      }
    }
    
    console.log(`Groups processing complete: ${newCount} new, ${updateCount} updated, ${unchangedCount} unchanged`);
  }

  async getGroupCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM "card-data-groups-tcgcsv"');
    return parseInt(result[0].count);
  }

  async clearTables(): Promise<void> {
    try {
      console.log('Clearing existing data...');
      await query('DELETE FROM "card-data-prices-tcgcsv"');
      await query('DELETE FROM "card-data-products-tcgcsv"');
      await query('DELETE FROM "card-data-groups-tcgcsv"');
      console.log('Tables cleared');
    } catch (error) {
      console.error('Error clearing tables:', error);
      throw error;
    }
  }
}
