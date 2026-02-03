import { query, transaction, queryInTransaction } from './db.js';
import { AppError } from '../utils/AppError.js';
import { Trade, TradeItem, CreateTradeDTO } from '../types/db.js';
import pg from 'pg';

/**
 * Service layer for trade management
 * Handles all business logic related to trades
 */
export class TradeService {
  /**
   * Get all trades for a user with items
   */
  async getTradesByUserId(userId: number): Promise<any[]> {
    return query(
      `SELECT t.*, 
              cs.show_name,
              (SELECT json_agg(ti.*) FROM trade_items ti WHERE ti.trade_id = t.id) as items
       FROM trades t
       LEFT JOIN card_shows cs ON t.show_id = cs.id
       WHERE t.user_id = $1
       ORDER BY t.trade_date DESC`,
      [userId]
    );
  }

  /**
   * Get single trade by ID
   */
  async getTradeById(tradeId: number, userId: number): Promise<any> {
    const [trade] = await query(
      `SELECT t.*, cs.show_name
       FROM trades t
       LEFT JOIN card_shows cs ON t.show_id = cs.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [tradeId, userId]
    );

    if (!trade) {
      throw AppError.notFound('Trade not found');
    }

    const items = await query(
      `SELECT ti.*, i.barcode_id, i.image_url
       FROM trade_items ti
       LEFT JOIN inventory i ON ti.inventory_id = i.id
       WHERE ti.trade_id = $1`,
      [tradeId]
    );

    return { ...trade, items };
  }

  /**
   * Get trade statistics for a user
   */
  async getTradeStats(userId: number): Promise<any> {
    const [stats] = await query(
      `SELECT 
        COUNT(*) as total_trades,
        COALESCE(SUM(trade_in_total), 0) as total_trade_in_value,
        COALESCE(SUM(trade_in_value), 0) as total_trade_in_credit,
        COALESCE(SUM(trade_out_total), 0) as total_trade_out_value,
        COALESCE(SUM(cash_to_customer), 0) as total_cash_to_customer,
        COALESCE(SUM(cash_from_customer), 0) as total_cash_from_customer
       FROM trades
       WHERE user_id = $1`,
      [userId]
    );

    return stats || {
      total_trades: 0,
      total_trade_in_value: 0,
      total_trade_in_credit: 0,
      total_trade_out_value: 0,
      total_cash_to_customer: 0,
      total_cash_from_customer: 0,
    };
  }

  /**
   * Get items pending barcode assignment
   */
  async getPendingBarcodes(userId: number): Promise<any[]> {
    return query(
      `SELECT i.*, ti.trade_id, t.customer_name, t.trade_date
       FROM inventory i
       LEFT JOIN trade_items ti ON i.id = ti.inventory_id AND ti.direction = 'in'
       LEFT JOIN trades t ON ti.trade_id = t.id
       WHERE i.user_id = $1
         AND (i.status = 'PENDING_BARCODE'
          OR (i.status = 'IN_STOCK' AND (i.barcode_id IS NULL OR i.barcode_id = '')))
       ORDER BY i.purchase_date DESC`,
      [userId]
    );
  }

  /**
   * Create a new trade with items
   */
  async createTrade(userId: number, data: CreateTradeDTO): Promise<any> {
    const {
      customer_name,
      trade_date,
      notes,
      trade_in_items = [],
      trade_out_items = [],
    } = data;

    // Validate trade has items
    if (trade_in_items.length === 0 && trade_out_items.length === 0) {
      throw AppError.badRequest('Trade must have at least one item');
    }

    return transaction(async (client: pg.PoolClient) => {
      // Calculate trade percentage (default 80%)
      const trade_percentage = 80;

      // Calculate totals
      const trade_in_total = trade_in_items.reduce(
        (sum, item) => sum + (parseFloat(item.card_value as any) || 0),
        0
      );
      const trade_in_value = trade_in_total * (trade_percentage / 100);
      const trade_out_total = trade_out_items.reduce(
        (sum, item) => sum + (parseFloat(item.card_value as any) || 0),
        0
      );

      const cash_to_customer = data.cash_to_customer || 0;
      const cash_from_customer = data.cash_from_customer || 0;

      // Create the trade record
      const [trade] = await queryInTransaction(
        client,
        `INSERT INTO trades (
          user_id, customer_name, trade_percentage, trade_in_total, 
          trade_in_value, trade_out_total, cash_to_customer, 
          cash_from_customer, notes, show_id, trade_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          customer_name || null,
          trade_percentage,
          trade_in_total,
          trade_in_value,
          trade_out_total,
          cash_to_customer,
          cash_from_customer,
          notes || null,
          data.show_id || null,
          trade_date || new Date(),
        ]
      );

      // Add trade-in items (cards coming IN from customer)
      for (const item of trade_in_items) {
        const itemTradePercentage = parseFloat(item.trade_percentage as any) || trade_percentage;
        const itemTradeValue =
          (parseFloat(item.card_value as any) || 0) * (itemTradePercentage / 100);

        // Create new inventory item for trade-in card with PENDING_BARCODE status
        const [newItem] = await queryInTransaction(
          client,
          `INSERT INTO inventory (
            user_id, barcode_id, card_name, set_name, game, card_type, 
            condition, purchase_price, purchase_date, front_label_price, 
            status, notes, cert_number, card_number, grade, grade_qualifier, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING_BARCODE', $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            userId,
            null, // No barcode yet
            item.card_name,
            item.set_name || null,
            item.game || 'pokemon',
            item.card_type || 'raw',
            item.condition || 'NM',
            itemTradeValue,
            trade_date || new Date(),
            item.front_label_price || item.card_value,
            `Trade-in from ${customer_name || 'customer'} @ ${itemTradePercentage}%`,
            item.cert_number || '',
            item.card_number || '',
            item.grade || null,
            item.grade_qualifier || null,
            item.image_url || null,
          ]
        );

        // Record trade item
        await queryInTransaction(
          client,
          `INSERT INTO trade_items (
            trade_id, inventory_id, direction, card_name, 
            set_name, card_value, trade_value
          ) VALUES ($1, $2, 'in', $3, $4, $5, $6)`,
          [trade.id, newItem.id, item.card_name, item.set_name, item.card_value, itemTradeValue]
        );
      }

      // Process trade-out items (cards going OUT to customer)
      for (const item of trade_out_items) {
        if (item.inventory_id) {
          // Update inventory item status to TRADED
          await queryInTransaction(
            client,
            `UPDATE inventory 
             SET status = 'TRADED', sale_date = $1, sale_price = $2
             WHERE id = $3 AND user_id = $4`,
            [trade_date || new Date(), item.card_value, item.inventory_id, userId]
          );
        }

        // Record trade item
        await queryInTransaction(
          client,
          `INSERT INTO trade_items (
            trade_id, inventory_id, direction, card_name, 
            set_name, card_value, trade_value
          ) VALUES ($1, $2, 'out', $3, $4, $5, $5)`,
          [trade.id, item.inventory_id, item.card_name, item.set_name, item.card_value]
        );
      }

      // Fetch the complete trade with items
      const items = await queryInTransaction(
        client,
        `SELECT * FROM trade_items WHERE trade_id = $1`,
        [trade.id]
      );

      return { ...trade, items };
    });
  }

  /**
   * Delete a trade and restore inventory items
   */
  async deleteTrade(tradeId: number, userId: number): Promise<void> {
    return transaction(async (client: pg.PoolClient) => {
      // Verify trade belongs to user
      const [trade] = await queryInTransaction(
        client,
        `SELECT * FROM trades WHERE id = $1 AND user_id = $2`,
        [tradeId, userId]
      );

      if (!trade) {
        throw AppError.notFound('Trade not found');
      }

      // Get trade items before deletion
      const items = await queryInTransaction(
        client,
        `SELECT * FROM trade_items WHERE trade_id = $1`,
        [tradeId]
      );

      // Restore trade-out items to IN_STOCK
      for (const item of items) {
        if (item.direction === 'out' && item.inventory_id) {
          await queryInTransaction(
            client,
            `UPDATE inventory 
             SET status = 'IN_STOCK', sale_date = NULL, sale_price = NULL 
             WHERE id = $1 AND user_id = $2`,
            [item.inventory_id, userId]
          );
        }
      }

      // Collect trade-in inventory IDs to delete
      const tradeInInventoryIds = items
        .filter((item: any) => item.direction === 'in' && item.inventory_id)
        .map((item: any) => item.inventory_id);

      // Delete trade (cascade will delete trade_items first)
      await queryInTransaction(client, `DELETE FROM trades WHERE id = $1`, [tradeId]);

      // Delete trade-in items from inventory
      for (const inventoryId of tradeInInventoryIds) {
        await queryInTransaction(
          client,
          `DELETE FROM inventory WHERE id = $1 AND user_id = $2`,
          [inventoryId, userId]
        );
      }
    });
  }

  /**
   * Assign barcode to a pending item
   */
  async assignBarcode(
    inventoryId: number,
    barcodeId: string,
    userId: number
  ): Promise<any> {
    if (!inventoryId || !barcodeId) {
      throw AppError.badRequest('inventory_id and barcode_id are required');
    }

    // Check if barcode already exists for this user
    const existing = await query(
      `SELECT id FROM inventory WHERE barcode_id = $1 AND user_id = $2`,
      [barcodeId, userId]
    );

    if (existing.length > 0) {
      throw AppError.conflict('Barcode already in use');
    }

    // Update the item with barcode and set status to IN_STOCK
    const [updated] = await query(
      `UPDATE inventory 
       SET barcode_id = $1, status = 'IN_STOCK'
       WHERE id = $2 AND user_id = $3 
       AND (status = 'PENDING_BARCODE' OR (status = 'IN_STOCK' AND (barcode_id IS NULL OR barcode_id = '')))
       RETURNING *`,
      [barcodeId, inventoryId, userId]
    );

    if (!updated) {
      throw AppError.notFound('Item not found or already has barcode');
    }

    return updated;
  }
}

// Export singleton instance
export const tradeService = new TradeService();
