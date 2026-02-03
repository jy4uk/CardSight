import { query } from './db.js';
import { AppError } from '../utils/AppError.js';
import { SavedDeal, CreateSavedDealDTO } from '../types/db.js';

/**
 * Service layer for saved deals management
 */
export class SavedDealService {
  /**
   * Get all saved deals for a user with optional type filter
   */
  async getSavedDealsByUserId(userId: number, dealType?: string): Promise<any[]> {
    let sql = `
      SELECT sd.*, cs.show_name
      FROM saved_deals sd
      LEFT JOIN card_shows cs ON sd.show_id = cs.id
      WHERE sd.user_id = $1
    `;
    
    const params: any[] = [userId];
    if (dealType) {
      sql += ` AND sd.deal_type = $2`;
      params.push(dealType);
    }
    
    sql += ` ORDER BY sd.created_at DESC`;
    
    const deals = await query(sql, params);
    
    // Check availability of trade-out items for each trade deal
    const dealsWithAvailability = await Promise.all(
      deals.map(async (deal: any) => {
        if (deal.deal_type === 'trade' && deal.trade_out_inventory_ids?.length > 0) {
          const availableItems = await query(
            `SELECT id FROM inventory 
             WHERE id = ANY($1) AND status = 'IN_STOCK' AND user_id = $2`,
            [deal.trade_out_inventory_ids, userId]
          );
          
          const availableIds = availableItems.map((i: any) => i.id);
          const unavailableIds = deal.trade_out_inventory_ids.filter(
            (id: number) => !availableIds.includes(id)
          );
          
          return {
            ...deal,
            unavailable_item_ids: unavailableIds,
            has_unavailable_items: unavailableIds.length > 0,
          };
        }
        return { ...deal, unavailable_item_ids: [], has_unavailable_items: false };
      })
    );
    
    return dealsWithAvailability;
  }

  /**
   * Get single saved deal by ID
   */
  async getSavedDealById(dealId: number, userId: number): Promise<any> {
    const [deal] = await query(
      `SELECT sd.*, cs.show_name
       FROM saved_deals sd
       LEFT JOIN card_shows cs ON sd.show_id = cs.id
       WHERE sd.id = $1 AND sd.user_id = $2`,
      [dealId, userId]
    );
    
    if (!deal) {
      throw AppError.notFound('Saved deal not found');
    }
    
    // Check availability of trade-out items
    if (deal.deal_type === 'trade' && deal.trade_out_inventory_ids?.length > 0) {
      const availableItems = await query(
        `SELECT id, card_name, status FROM inventory 
         WHERE id = ANY($1) AND user_id = $2`,
        [deal.trade_out_inventory_ids, userId]
      );
      
      const availableIds = availableItems
        .filter((i: any) => i.status === 'IN_STOCK')
        .map((i: any) => i.id);
      const unavailableItems = availableItems.filter((i: any) => i.status !== 'IN_STOCK');
      
      deal.unavailable_item_ids = deal.trade_out_inventory_ids.filter(
        (id: number) => !availableIds.includes(id)
      );
      deal.unavailable_items = unavailableItems;
      deal.has_unavailable_items = deal.unavailable_item_ids.length > 0;
    } else {
      deal.unavailable_item_ids = [];
      deal.has_unavailable_items = false;
    }
    
    return deal;
  }

  /**
   * Create a new saved deal
   */
  async createSavedDeal(userId: number, data: CreateSavedDealDTO): Promise<SavedDeal> {
    const {
      deal_type,
      customer_name,
      customer_note,
      deal_data,
      total_items,
      total_value,
      trade_out_inventory_ids,
      show_id,
      expires_at,
    } = data;

    if (!deal_type || !deal_data) {
      throw AppError.badRequest('deal_type and deal_data are required');
    }

    const [deal] = await query<SavedDeal>(
      `INSERT INTO saved_deals (
        user_id, deal_type, customer_name, customer_note, deal_data,
        total_items, total_value, trade_out_inventory_ids, show_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        deal_type,
        customer_name || null,
        customer_note || null,
        JSON.stringify(deal_data),
        total_items || null,
        total_value || null,
        trade_out_inventory_ids || null,
        show_id || null,
        expires_at || null,
      ]
    );

    return deal;
  }

  /**
   * Update a saved deal
   */
  async updateSavedDeal(
    dealId: number,
    userId: number,
    data: Partial<CreateSavedDealDTO>
  ): Promise<SavedDeal> {
    // Verify deal exists and belongs to user
    await this.getSavedDealById(dealId, userId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.customer_name !== undefined) {
      updates.push(`customer_name = $${paramCount}`);
      values.push(data.customer_name);
      paramCount++;
    }

    if (data.customer_note !== undefined) {
      updates.push(`customer_note = $${paramCount}`);
      values.push(data.customer_note);
      paramCount++;
    }

    if (data.deal_data !== undefined) {
      updates.push(`deal_data = $${paramCount}`);
      values.push(JSON.stringify(data.deal_data));
      paramCount++;
    }

    if (data.total_items !== undefined) {
      updates.push(`total_items = $${paramCount}`);
      values.push(data.total_items);
      paramCount++;
    }

    if (data.total_value !== undefined) {
      updates.push(`total_value = $${paramCount}`);
      values.push(data.total_value);
      paramCount++;
    }

    if (data.trade_out_inventory_ids !== undefined) {
      updates.push(`trade_out_inventory_ids = $${paramCount}`);
      values.push(data.trade_out_inventory_ids);
      paramCount++;
    }

    if (data.show_id !== undefined) {
      updates.push(`show_id = $${paramCount}`);
      values.push(data.show_id);
      paramCount++;
    }

    if (data.expires_at !== undefined) {
      updates.push(`expires_at = $${paramCount}`);
      values.push(data.expires_at);
      paramCount++;
    }

    if (updates.length === 0) {
      throw AppError.badRequest('No fields to update');
    }

    values.push(dealId, userId);

    const [deal] = await query<SavedDeal>(
      `UPDATE saved_deals 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (!deal) {
      throw AppError.notFound('Saved deal not found');
    }

    return deal;
  }

  /**
   * Delete a saved deal
   */
  async deleteSavedDeal(dealId: number, userId: number): Promise<void> {
    const [result] = await query<{ id: number }>(
      `DELETE FROM saved_deals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [dealId, userId]
    );

    if (!result) {
      throw AppError.notFound('Saved deal not found');
    }
  }

  /**
   * Validate deal availability (check if trade-out items are still available)
   */
  async validateDealAvailability(dealId: number, userId: number): Promise<any> {
    const deal = await this.getSavedDealById(dealId, userId);

    if (deal.deal_type !== 'trade' || !deal.trade_out_inventory_ids?.length) {
      return {
        valid: true,
        unavailable_items: [],
      };
    }

    const items = await query(
      `SELECT id, card_name, set_name, status, front_label_price
       FROM inventory
       WHERE id = ANY($1) AND user_id = $2`,
      [deal.trade_out_inventory_ids, userId]
    );

    const unavailableItems = items.filter((item: any) => item.status !== 'IN_STOCK');

    return {
      valid: unavailableItems.length === 0,
      unavailable_items: unavailableItems,
      total_items: items.length,
      available_items: items.length - unavailableItems.length,
    };
  }
}

// Export singleton instance
export const savedDealService = new SavedDealService();
