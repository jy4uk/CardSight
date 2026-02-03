import { query } from './db.js';
import { AppError } from '../utils/AppError.js';
import { InventoryMetrics, SalesMetrics, TradeMetrics, CardShow } from '../types/db.js';

/**
 * Service layer for business insights and analytics
 */
export class InsightsService {
  /**
   * Get comprehensive business insights for a user
   */
  async getBusinessInsights(userId: number, timeRange: string = '30d'): Promise<any> {
    // Calculate date filter based on time range
    let dateFilter = '';
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        dateFilter = `AND created_at >= NOW() - INTERVAL '7 days'`;
        break;
      case '30d':
        dateFilter = `AND created_at >= NOW() - INTERVAL '30 days'`;
        break;
      case '90d':
        dateFilter = `AND created_at >= NOW() - INTERVAL '90 days'`;
        break;
      case '1y':
        dateFilter = `AND created_at >= NOW() - INTERVAL '1 year'`;
        break;
      case 'all':
        dateFilter = '';
        break;
      default:
        dateFilter = `AND created_at >= NOW() - INTERVAL '30 days'`;
    }

    // Get inventory stats
    const [inventoryStats] = await query<InventoryMetrics>(
      `SELECT
        COUNT(*) as total_inventory,
        COALESCE(SUM(front_label_price), 0) as total_value,
        AVG(front_label_price) as avg_price
       FROM inventory
       WHERE status = 'IN_STOCK' AND user_id = $1`,
      [userId]
    );

    // Get sales stats
    const [salesStats] = await query<SalesMetrics>(
      `SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(sale_price), 0) as total_revenue,
        AVG(sale_price) as avg_sale_price
       FROM transactions
       WHERE user_id = $1 ${dateFilter}`,
      [userId]
    );

    // Get trade stats
    const [tradeStats] = await query<TradeMetrics>(
      `SELECT
        COUNT(*) as total_trades,
        COALESCE(SUM(trade_in_value), 0) as total_trade_in_value,
        COALESCE(SUM(trade_out_total), 0) as total_trade_out_value
       FROM trades
       WHERE user_id = $1 ${dateFilter}`,
      [userId]
    );

    // Get recent transactions
    const recentTransactions = await query(
      `SELECT t.*, i.card_name, i.set_name
       FROM transactions t
       LEFT JOIN inventory i ON t.inventory_id = i.id
       WHERE t.user_id = $1
       ORDER BY t.sale_date DESC
       LIMIT 10`,
      [userId]
    );

    return {
      inventory: inventoryStats || { total_inventory: 0, total_value: 0, avg_price: 0 },
      sales: salesStats || { total_sales: 0, total_revenue: 0, avg_sale_price: 0 },
      trades: tradeStats || { total_trades: 0, total_trade_in_value: 0, total_trade_out_value: 0 },
      recent_transactions: recentTransactions,
      time_range: timeRange,
    };
  }

  /**
   * Get all card shows for a user
   */
  async getCardShows(userId: number): Promise<CardShow[]> {
    return query<CardShow>(
      `SELECT * FROM card_shows 
       WHERE user_id = $1 
       ORDER BY show_date DESC`,
      [userId]
    );
  }

  /**
   * Create a new card show
   */
  async createCardShow(
    userId: number,
    showName: string,
    location?: string,
    showDate?: string
  ): Promise<CardShow> {
    if (!showName) {
      throw AppError.badRequest('show_name is required');
    }

    const [cardShow] = await query<CardShow>(
      `INSERT INTO card_shows (user_id, show_name, location, show_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, showName, location || null, showDate || null]
    );

    return cardShow;
  }

  /**
   * Delete a card show
   */
  async deleteCardShow(showId: number, userId: number): Promise<void> {
    // Verify show belongs to user
    const [show] = await query<CardShow>(
      `SELECT * FROM card_shows WHERE id = $1 AND user_id = $2`,
      [showId, userId]
    );

    if (!show) {
      throw AppError.notFound('Card show not found');
    }

    await query(`DELETE FROM card_shows WHERE id = $1 AND user_id = $2`, [showId, userId]);
  }

  /**
   * Get inventory metrics by status
   */
  async getInventoryMetricsByStatus(userId: number): Promise<Record<string, number>> {
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

  /**
   * Get sales by date range
   */
  async getSalesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    return query(
      `SELECT 
        DATE(sale_date) as date,
        COUNT(*) as count,
        SUM(sale_price) as total_revenue
       FROM transactions
       WHERE user_id = $1 
       AND sale_date >= $2 
       AND sale_date <= $3
       GROUP BY DATE(sale_date)
       ORDER BY date DESC`,
      [userId, startDate, endDate]
    );
  }

  /**
   * Get top selling cards
   */
  async getTopSellingCards(userId: number, limit: number = 10): Promise<any[]> {
    return query(
      `SELECT 
        i.card_name,
        i.set_name,
        COUNT(*) as sales_count,
        SUM(t.sale_price) as total_revenue,
        AVG(t.sale_price) as avg_sale_price
       FROM transactions t
       JOIN inventory i ON t.inventory_id = i.id
       WHERE t.user_id = $1
       GROUP BY i.card_name, i.set_name
       ORDER BY sales_count DESC
       LIMIT $2`,
      [userId, limit]
    );
  }
}

// Export singleton instance
export const insightsService = new InsightsService();
