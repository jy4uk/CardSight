import { query } from '../services/db.js';
import { UserService } from '../auth/user-service.js';

export class MultiUserDatabaseService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Inventory methods with user isolation
  async getInventoryByUserId(userId: number, filters?: any) {
    let sql = 'SELECT * FROM inventory WHERE user_id = $1';
    const params:[any] = [userId];

    if (filters?.status) {
      sql += ' AND status = $2';
      params.push(filters.status);
    }

    if (filters?.cardName) {
      sql += ' AND card_name ILIKE $' + (params.length + 1);
      params.push(`%${filters.cardName}%`);
    }

    sql += ' ORDER BY created_at DESC';

    return await query(sql, params);
  }

  async insertInventoryItem(userId: number, itemData: any) {
    const sql = `
      INSERT INTO inventory (
        user_id, barcode_id, card_name, set_name, series, game, card_type,
        cert_number, card_number, condition, grade, grade_qualifier,
        purchase_price, purchase_date, front_label_price, sale_price,
        sale_date, status, image_url, notes, tcg_product_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const params = [
      userId,
      itemData.barcode_id,
      itemData.card_name,
      itemData.set_name,
      itemData.series,
      itemData.game || 'pokemon',
      itemData.card_type || 'raw',
      itemData.cert_number,
      itemData.card_number,
      itemData.condition,
      itemData.grade,
      itemData.grade_qualifier,
      itemData.purchase_price,
      itemData.purchase_date,
      itemData.front_label_price,
      itemData.sale_price,
      itemData.sale_date,
      itemData.status || 'PLANNED',
      itemData.image_url,
      itemData.notes,
      itemData.tcg_product_id
    ];

    return await query(sql, params);
  }

  // Transaction methods with user isolation
  async getTransactionsByUserId(userId: number, filters?: any) {
    let sql = `
      SELECT t.*, i.card_name, i.barcode_id 
      FROM transactions t 
      LEFT JOIN inventory i ON t.inventory_id = i.id 
      WHERE t.user_id = $1
    `;
    const params = [userId];

    if (filters?.startDate) {
      sql += ' AND t.sale_date >= $2';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ' AND t.sale_date <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    sql += ' ORDER BY t.sale_date DESC';

    return await query(sql, params);
  }

  async insertTransaction(userId: number, transactionData: any) {
    const sql = `
      INSERT INTO transactions (
        user_id, inventory_id, stripe_payment_intent_id, sale_price,
        fees, net_amount, sale_date, payment_method, show_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;

    const params = [
      userId,
      transactionData.inventory_id,
      transactionData.stripe_payment_intent_id,
      transactionData.sale_price,
      transactionData.fees,
      transactionData.net_amount,
      transactionData.sale_date,
      transactionData.payment_method,
      transactionData.show_id
    ];

    return await query(sql, params);
  }

  // Trade methods with user isolation
  async getTradesByUserId(userId: number, filters?: any) {
    let sql = `
      SELECT t.*, cs.show_name 
      FROM trades t 
      LEFT JOIN card_shows cs ON t.show_id = cs.id 
      WHERE t.user_id = $1
    `;
    const params = [userId];

    if (filters?.startDate) {
      sql += ' AND t.trade_date >= $2';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ' AND t.trade_date <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    sql += ' ORDER BY t.trade_date DESC';

    return await query(sql, params);
  }

  async insertTrade(userId: number, tradeData: any) {
    const sql = `
      INSERT INTO trades (
        user_id, trade_date, customer_name, trade_percentage,
        trade_in_total, trade_in_value, trade_out_total,
        cash_to_customer, cash_from_customer, notes, show_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `;

    const params = [
      userId,
      tradeData.trade_date || new Date(),
      tradeData.customer_name,
      tradeData.trade_percentage || 80.00,
      tradeData.trade_in_total || 0,
      tradeData.trade_in_value || 0,
      tradeData.trade_out_total || 0,
      tradeData.cash_to_customer || 0,
      tradeData.cash_from_customer || 0,
      tradeData.notes,
      tradeData.show_id
    ];

    return await query(sql, params);
  }

  // Card shows methods with user isolation
  async getCardShowsByUserId(userId: number) {
    const sql = 'SELECT * FROM card_shows WHERE user_id = $1 ORDER BY show_date DESC';
    return await query(sql, [userId]);
  }

  async insertCardShow(userId: number, showData: any) {
    const sql = `
      INSERT INTO card_shows (user_id, show_date, show_name, location, notes)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;

    const params = [
      userId,
      showData.show_date,
      showData.show_name,
      showData.location,
      showData.notes
    ];

    return await query(sql, params);
  }

  // User statistics
  async getUserStats(userId: number) {
    const stats = await Promise.all([
      query('SELECT COUNT(*) as count FROM inventory WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM transactions WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM trades WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*) as count FROM card_shows WHERE user_id = $1', [userId]),
      query('SELECT SUM(sale_price) as total FROM transactions WHERE user_id = $1', [userId])
    ]);

    return {
      inventoryCount: parseInt(stats[0][0].count),
      transactionCount: parseInt(stats[1][0].count),
      tradeCount: parseInt(stats[2][0].count),
      cardShowCount: parseInt(stats[3][0].count),
      totalSales: parseFloat(stats[4][0].total) || 0
    };
  }
}
