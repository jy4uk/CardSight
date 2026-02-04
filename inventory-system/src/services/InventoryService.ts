/**
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * This file contains trade secrets and proprietary information of Card Sight.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited.
 * 
 * Copyright (c) 2024-2026 Card Sight. All Rights Reserved.
 * 
 * For licensing inquiries: legal@cardsight.com
 */

import { query, transaction, queryInTransaction } from './db.js';
import { AppError } from '../utils/AppError.js';
import {
  InventoryItem,
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
  BulkUploadResult,
} from '../types/db.js';

/**
 * Service layer for inventory management
 * Handles all business logic related to inventory items
 */
export class InventoryService {
  /**
   * Get all inventory items for a user
   */
  async getInventoryByUserId(userId: number): Promise<InventoryItem[]> {
    return query<InventoryItem>(
      `SELECT * FROM inventory 
       WHERE user_id = $1 AND deleted_at IS NULL 
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  /**
   * Get public inventory for a username (for public profile viewing)
   */
  async getPublicInventory(username: string): Promise<InventoryItem[]> {
    return query<InventoryItem>(
      `SELECT i.* FROM inventory i
       JOIN users u ON i.user_id = u.id
       WHERE u.username = $1 
       AND i.deleted_at IS NULL 
       AND i.status = 'IN_STOCK'
       ORDER BY i.created_at DESC`,
      [username]
    );
  }

  /**
   * Get single inventory item by ID
   */
  async getInventoryItemById(id: number, userId: number): Promise<InventoryItem> {
    const [item] = await query<InventoryItem>(
      `SELECT * FROM inventory 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, userId]
    );

    if (!item) {
      throw AppError.notFound('Inventory item not found');
    }

    return item;
  }

  /**
   * Get inventory item by barcode
   */
  async getInventoryItemByBarcode(barcode: string, userId: number): Promise<InventoryItem> {
    const [item] = await query<InventoryItem>(
      `SELECT * FROM inventory 
       WHERE barcode_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [barcode, userId]
    );

    if (!item) {
      throw AppError.notFound('Item with this barcode not found');
    }

    return item;
  }

  /**
   * Check if barcode already exists for user
   */
  async barcodeExists(barcode: string, userId: number): Promise<boolean> {
    const [result] = await query<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM inventory 
        WHERE barcode_id = $1 AND user_id = $2 AND deleted_at IS NULL
      ) as exists`,
      [barcode, userId]
    );

    return result.exists;
  }

  /**
   * Create new inventory item
   */
  async createInventoryItem(
    userId: number,
    data: CreateInventoryItemDTO
  ): Promise<InventoryItem> {
    // Validate required fields
    if (!data.card_name || !data.front_label_price) {
      throw AppError.badRequest('card_name and front_label_price are required');
    }

    // Check barcode uniqueness if provided
    if (data.barcode_id) {
      const exists = await this.barcodeExists(data.barcode_id, userId);
      if (exists) {
        throw AppError.conflict('Barcode already in use');
      }
    }

    const [item] = await query<InventoryItem>(
      `INSERT INTO inventory (
        user_id, card_name, set_name, card_number, game, card_type,
        purchase_price, front_label_price, condition, quantity,
        barcode_id, cert_number, grade, image_url, status, purchase_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        userId,
        data.card_name,
        data.set_name || null,
        data.card_number || null,
        data.game || 'pokemon',
        data.card_type || 'raw',
        data.purchase_price || null,
        data.front_label_price,
        data.condition || null,
        data.quantity || 1,
        data.barcode_id || null,
        data.cert_number || null,
        data.grade || null,
        data.image_url || null,
        data.status || 'IN_STOCK',
        data.purchase_date || null,
      ]
    );

    return item;
  }

  /**
   * Update inventory item
   */
  async updateInventoryItem(
    id: number,
    userId: number,
    data: UpdateInventoryItemDTO
  ): Promise<InventoryItem> {
    // Verify item exists and belongs to user
    await this.getInventoryItemById(id, userId);

    // Check barcode uniqueness if being updated
    if (data.barcode_id) {
      const [existing] = await query<{ id: number }>(
        `SELECT id FROM inventory 
         WHERE barcode_id = $1 AND user_id = $2 AND id != $3 AND deleted_at IS NULL`,
        [data.barcode_id, userId, id]
      );

      if (existing) {
        throw AppError.conflict('Barcode already in use');
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fields: (keyof UpdateInventoryItemDTO)[] = [
      'card_name',
      'set_name',
      'card_number',
      'game',
      'card_type',
      'purchase_price',
      'front_label_price',
      'condition',
      'quantity',
      'barcode_id',
      'cert_number',
      'grade',
      'image_url',
      'status',
      'purchase_date',
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw AppError.badRequest('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, userId);

    const [item] = await query<InventoryItem>(
      `UPDATE inventory 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (!item) {
      throw AppError.notFound('Inventory item not found');
    }

    return item;
  }

  /**
   * Delete inventory item (soft delete)
   */
  async deleteInventoryItem(id: number, userId: number): Promise<void> {
    const [result] = await query<{ id: number }>(
      `UPDATE inventory 
       SET deleted_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );

    if (!result) {
      throw AppError.notFound('Inventory item not found');
    }
  }

  /**
   * Bulk create inventory items
   * Returns detailed success/failure results
   */
  async bulkCreateInventory(
    userId: number,
    items: CreateInventoryItemDTO[]
  ): Promise<BulkUploadResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw AppError.badRequest('Items array is required and must not be empty');
    }

    if (items.length > 1000) {
      throw AppError.badRequest('Maximum 1000 items can be added at once');
    }

    const results: BulkUploadResult = {
      success: [],
      failed: [],
      total: items.length,
    };

    // Process items sequentially to maintain order and handle individual errors
    for (let i = 0; i < items.length; i++) {
      try {
        const itemData = items[i];

        // Validate required fields
        if (!itemData.card_name || !itemData.front_label_price) {
          results.failed.push({
            index: i,
            item: itemData,
            error: 'card_name and front_label_price are required',
          });
          continue;
        }

        // Check barcode uniqueness
        if (itemData.barcode_id) {
          const exists = await this.barcodeExists(itemData.barcode_id, userId);
          if (exists) {
            results.failed.push({
              index: i,
              item: itemData,
              error: 'Barcode already in use',
            });
            continue;
          }
        }

        // Create item
        const item = await this.createInventoryItem(userId, itemData);
        results.success.push({ index: i, item });
      } catch (err) {
        results.failed.push({
          index: i,
          item: items[i],
          error: err instanceof Error ? err.message : 'Failed to add item',
        });
      }
    }

    return results;
  }

  /**
   * Get pending barcodes (items without barcode_id)
   */
  async getPendingBarcodes(userId: number): Promise<InventoryItem[]> {
    return query<InventoryItem>(
      `SELECT * FROM inventory 
       WHERE user_id = $1 
       AND (barcode_id IS NULL OR barcode_id = '') 
       AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  /**
   * Assign barcode to item
   */
  async assignBarcode(
    id: number,
    userId: number,
    barcodeId: string
  ): Promise<InventoryItem> {
    // Check barcode uniqueness
    const exists = await this.barcodeExists(barcodeId, userId);
    if (exists) {
      throw AppError.conflict('Barcode already in use');
    }

    const [item] = await query<InventoryItem>(
      `UPDATE inventory 
       SET barcode_id = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [barcodeId, id, userId]
    );

    if (!item) {
      throw AppError.notFound('Inventory item not found');
    }

    return item;
  }

  /**
   * Update item status
   */
  async updateItemStatus(
    id: number,
    userId: number,
    status: string
  ): Promise<InventoryItem> {
    const [item] = await query<InventoryItem>(
      `UPDATE inventory 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [status, id, userId]
    );

    if (!item) {
      throw AppError.notFound('Inventory item not found');
    }

    return item;
  }

  /**
   * Get inventory count by status
   */
  async getInventoryCountByStatus(userId: number): Promise<Record<string, number>> {
    const results = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int as count
       FROM inventory
       WHERE user_id = $1 AND deleted_at IS NULL
       GROUP BY status`,
      [userId]
    );

    return results.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
