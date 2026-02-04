import express from 'express';
import { query } from '../services/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get business insights and metrics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;
    
    // Calculate date range filters (must be table-specific)
    let salesDateFilter = '';
    let tradeDateFilter = '';
    let inventoryDateFilter = '';
    switch (timeRange) {
      case '7d':
        salesDateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '7 days'`;
        tradeDateFilter = `AND t.trade_date >= NOW() - INTERVAL '7 days'`;
        inventoryDateFilter = `AND i.purchase_date >= NOW() - INTERVAL '7 days'`;
        break;
      case '30d':
        salesDateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '30 days'`;
        tradeDateFilter = `AND t.trade_date >= NOW() - INTERVAL '30 days'`;
        inventoryDateFilter = `AND i.purchase_date >= NOW() - INTERVAL '30 days'`;
        break;
      case '90d':
        salesDateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '90 days'`;
        tradeDateFilter = `AND t.trade_date >= NOW() - INTERVAL '90 days'`;
        inventoryDateFilter = `AND i.purchase_date >= NOW() - INTERVAL '90 days'`;
        break;
      case '1y':
        salesDateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '1 year'`;
        tradeDateFilter = `AND t.trade_date >= NOW() - INTERVAL '1 year'`;
        inventoryDateFilter = `AND i.purchase_date >= NOW() - INTERVAL '1 year'`;
        break;
      default:
        salesDateFilter = '';
        tradeDateFilter = '';
        inventoryDateFilter = '';
    }

    // Get inventory metrics
    const inventoryStats = await query(`
      SELECT 
        COUNT(*) as total_inventory,
        COALESCE(SUM(front_label_price), 0) as total_value,
        AVG(front_label_price) as avg_price
      FROM inventory 
      WHERE status = 'IN_STOCK' AND user_id = $1
    `, [userId]);

    // Get sales metrics
    const salesStats = await query(`
      SELECT 
        COUNT(*) as items_sold,
        COALESCE(SUM(transactions.sale_price), 0) as total_revenue,
        COALESCE(SUM(transactions.sale_price - inventory.purchase_price), 0) as total_profit,
        AVG(transactions.sale_price) as avg_sale_price
      FROM transactions
      JOIN inventory ON transactions.inventory_id = inventory.id
      WHERE inventory.user_id = $1 ${salesDateFilter}
    `, [userId]);

    // Get trade metrics
    const tradeStats = await query(`
      SELECT 
        COUNT(DISTINCT t.id) as trades_count,
        COUNT(CASE WHEN ti.direction = 'out' THEN 1 END) as items_traded_out,
        COALESCE(SUM(CASE WHEN ti.direction = 'out' THEN ti.trade_value ELSE 0 END), 0) as total_trade_out_value,
        COALESCE(SUM(CASE WHEN ti.direction = 'out' THEN (ti.trade_value - i.purchase_price) ELSE 0 END), 0) as total_trade_out_profit,
        AVG(CASE WHEN ti.direction = 'out' THEN ti.trade_value ELSE NULL END) as avg_trade_out_value
      FROM trades t
      JOIN trade_items ti ON t.id = ti.trade_id
      LEFT JOIN inventory i ON ti.inventory_id = i.id
      WHERE t.user_id = $1 ${tradeDateFilter}
    `, [userId]);

    // Get sales trend data (daily)
    const salesTrend = await query(`
      SELECT 
        DATE(transactions.sale_date) as date,
        COUNT(*) as sales_count,
        SUM(transactions.sale_price) as revenue,
        SUM(transactions.sale_price - inventory.purchase_price) as profit
      FROM transactions
      JOIN inventory ON transactions.inventory_id = inventory.id
      WHERE inventory.user_id = $1 ${salesDateFilter}
      GROUP BY DATE(transactions.sale_date)
      ORDER BY date DESC
      LIMIT 30
    `, [userId]);

    // Get inventory distribution by game
    const gameDistribution = await query(`
      SELECT 
        game,
        COUNT(*) as count,
        COALESCE(SUM(front_label_price), 0) as value
      FROM inventory 
      WHERE status = 'IN_STOCK' AND user_id = $1
      GROUP BY game
      ORDER BY count DESC
    `, [userId]);

    // Get inventory type breakdown
    const inventoryTypeBreakdown = await query(`
      SELECT 
        CASE 
          WHEN card_type = 'raw' THEN 'Singles'
          ELSE card_type || ' Slabs'
        END as inventory_type,
        COUNT(*) as count,
        COALESCE(SUM(front_label_price), 0) as total_value
      FROM inventory 
      WHERE status = 'IN_STOCK' AND user_id = $1
      GROUP BY 
        CASE 
          WHEN card_type = 'raw' THEN 'Singles'
          ELSE card_type || ' Slabs'
        END
      ORDER BY count DESC
    `, [userId]);

    // Get card shows data
    const cardShows = await query(`
      SELECT 
        cs.id,
        cs.show_date,
        cs.show_name,
        cs.location,
        COUNT(t.id) as cards_sold,
        COALESCE(SUM(t.sale_price), 0) as total_revenue,
        COALESCE(SUM(t.sale_price - i.purchase_price), 0) as total_profit
      FROM card_shows cs
      LEFT JOIN transactions t ON cs.id = t.show_id AND t.user_id = $1
      LEFT JOIN inventory i ON t.inventory_id = i.id AND i.user_id = $1
      WHERE cs.user_id = $1
      GROUP BY cs.id, cs.show_date, cs.show_name, cs.location
      ORDER BY cs.show_date DESC
    `, [userId]);

    // Get recent transactions (sales + trade-outs)
    const recentTransactions = await query(`
      (
        SELECT 
          'sale' as transaction_type,
          transactions.sale_price as value,
          transactions.sale_date as date,
          COALESCE(transactions.sale_price - inventory.purchase_price, transactions.sale_price) as profit,
          inventory.card_name,
          inventory.set_name,
          inventory.game,
          inventory.purchase_date,
          GREATEST(0, EXTRACT(EPOCH FROM (transactions.sale_date - inventory.purchase_date)) / 86400) as days_in_inventory,
          COALESCE(card_shows.show_name, 'Direct Sale') as show_name,
          COALESCE(card_shows.location, '') as location,
          transactions.show_id,
          COALESCE(purchase_shows.show_name, '') as purchase_show_name,
          NULL as trade_id,
          NULL as customer_name,
          inventory.id as inventory_id,
          transactions.payment_method
        FROM transactions
        JOIN inventory ON transactions.inventory_id = inventory.id
        LEFT JOIN card_shows ON transactions.show_id = card_shows.id
        LEFT JOIN card_shows AS purchase_shows ON inventory.purchase_show_id = purchase_shows.id
        WHERE inventory.user_id = $1 ${salesDateFilter}
      )
      UNION ALL
      (
        SELECT 
          'trade' as transaction_type,
          ti.trade_value as value,
          t.trade_date as date,
          COALESCE(ti.trade_value - i.purchase_price, ti.trade_value) as profit,
          COALESCE(i.card_name, ti.card_name) as card_name,
          COALESCE(i.set_name, ti.set_name) as set_name,
          COALESCE(i.game, 'pokemon') as game,
          i.purchase_date,
          GREATEST(0, EXTRACT(EPOCH FROM (t.trade_date - i.purchase_date)) / 86400) as days_in_inventory,
          COALESCE(card_shows.show_name, 'Trade') as show_name,
          COALESCE(card_shows.location, '') as location,
          t.show_id,
          COALESCE(purchase_shows.show_name, '') as purchase_show_name,
          t.id as trade_id,
          t.customer_name,
          i.id as inventory_id,
          NULL as payment_method
        FROM trades t
        JOIN trade_items ti ON t.id = ti.trade_id
        JOIN inventory i ON ti.inventory_id = i.id
        LEFT JOIN card_shows ON t.show_id = card_shows.id
        LEFT JOIN card_shows AS purchase_shows ON i.purchase_show_id = purchase_shows.id
        WHERE ti.direction = 'out' AND t.user_id = $1 ${tradeDateFilter}
      )
      ORDER BY date DESC
      LIMIT 10
    `, [userId]);

    // Inventory value gained (for modal)
    const inventoryValueByDate = await query(`
      SELECT
        DATE(i.purchase_date) as date,
        COUNT(*) as cards_added,
        COALESCE(SUM(i.front_label_price), 0) as value_gained
      FROM inventory i
      WHERE i.user_id = $1 AND i.purchase_date IS NOT NULL ${inventoryDateFilter}
      GROUP BY DATE(i.purchase_date)
      ORDER BY date DESC
      LIMIT 60
    `, [userId]);

    const inventoryValueByCard = await query(`
      SELECT
        i.card_name,
        i.set_name,
        COUNT(*) as count,
        COALESCE(SUM(i.front_label_price), 0) as value_gained,
        MAX(i.purchase_date) as last_added
      FROM inventory i
      WHERE i.user_id = $1 AND i.purchase_date IS NOT NULL ${inventoryDateFilter}
      GROUP BY i.card_name, i.set_name
      ORDER BY value_gained DESC
      LIMIT 100
    `, [userId]);

    // Calculate profit margin and time metrics (including trade-outs)
    const toNumber = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : 0;
    };

    const totalRevenue = toNumber(salesStats[0]?.total_revenue);
    const totalProfit = toNumber(salesStats[0]?.total_profit);
    const totalTradeOutValue = toNumber(tradeStats[0]?.total_trade_out_value);
    const totalTradeOutProfit = toNumber(tradeStats[0]?.total_trade_out_profit);
    
    // Include trade-outs in total revenue and profit
    const adjustedRevenue = totalRevenue + totalTradeOutValue;
    const adjustedProfit = totalProfit + totalTradeOutProfit;
    const profitMargin = adjustedRevenue > 0 ? ((adjustedProfit / adjustedRevenue) * 100) : 0;

    const salesTransactionsForTime = recentTransactions.filter(t => t.transaction_type === 'sale');
    const avgTimeInInventory = salesTransactionsForTime.length > 0
      ? salesTransactionsForTime.reduce((sum, sale) => sum + (Number(sale.days_in_inventory) || 0), 0) / salesTransactionsForTime.length
      : 0;

    const metrics = {
      totalInventory: Number(inventoryStats[0]?.total_inventory || 0),
      totalValue: Number(inventoryStats[0]?.total_value || 0),
      itemsSold: Number(salesStats[0]?.items_sold || 0),
      itemsTraded: Number(tradeStats[0]?.items_traded_out || 0),
      totalRevenue: Number(adjustedRevenue),
      totalProfit: Number(adjustedProfit),
      profitMargin: Number(profitMargin.toFixed(1)),
      avgSalePrice: toNumber(salesStats[0]?.avg_sale_price),
      avgTradePrice: toNumber(tradeStats[0]?.avg_trade_out_value),
      avgInventoryPrice: Number(inventoryStats[0]?.avg_price || 0),
      avgTimeInInventory: Number(avgTimeInInventory.toFixed(1)),
      salesTrend: salesTrend.map(row => ({
        date: row.date,
        sales: Number(row.sales_count),
        revenue: Number(row.revenue)
      })),
      gameDistribution: gameDistribution.map(row => ({
        game: row.game,
        count: Number(row.count),
        value: Number(row.value)
      })),
      inventoryTypeBreakdown: inventoryTypeBreakdown.map(row => ({
        inventoryType: row.inventory_type,
        count: Number(row.count),
        totalValue: Number(row.total_value)
      })),
      recentTransactions: recentTransactions.map(row => ({
        transactionType: row.transaction_type,
        value: Number(row.value),
        profit: Number(row.profit),
        date: row.date,
        purchaseDate: row.purchase_date,
        daysInInventory: Number(row.days_in_inventory || 0),
        cardName: row.card_name,
        setName: row.set_name,
        game: row.game,
        showName: row.show_name,
        location: row.location,
        showId: row.show_id,
        purchaseShowName: row.purchase_show_name,
        tradeId: row.trade_id,
        customerName: row.customer_name,
        inventoryId: row.inventory_id,
        paymentMethod: row.payment_method
      })),
      inventoryValueByDate: inventoryValueByDate.map(row => ({
        date: row.date,
        cardsAdded: Number(row.cards_added),
        valueGained: Number(row.value_gained)
      })),
      inventoryValueByCard: inventoryValueByCard.map(row => ({
        cardName: row.card_name,
        setName: row.set_name,
        count: Number(row.count),
        valueGained: Number(row.value_gained),
        lastAdded: row.last_added
      })),
      cardShows: cardShows.map(row => ({
        id: row.id,
        showDate: row.show_date,
        showName: row.show_name,
        location: row.location,
        cardsSold: Number(row.cards_sold),
        totalRevenue: Number(row.total_revenue),
        totalProfit: Number(row.total_profit)
      }))
    };

    res.json({ success: true, metrics });
  } catch (err) {
    console.error('Insights API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new card show
router.post('/card-shows', authenticateToken, async (req, res) => {
  try {
    const { showName, location, showDate } = req.body;
    
    if (!showName || !location || !showDate) {
      return res.status(400).json({ success: false, error: 'Show name, location, and date are required' });
    }

    let result;
    
    try {
      // Try to insert new show
      result = await query(`
        INSERT INTO card_shows (user_id, show_name, location, show_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [req.user.userId, showName, location, showDate]);
    } catch (insertError) {
      // If it's a duplicate key error (show_date already exists), update existing show
      if (insertError.code === '23505') {
        const updateResult = await query(`
          UPDATE card_shows 
          SET show_name = $1, location = $2
          WHERE show_date = $3 AND user_id = $4
          RETURNING *
        `, [showName, location, showDate, req.user.userId]);
        
        result = updateResult;
      } else {
        // Re-throw other errors
        throw insertError;
      }
    }

    if (!result || result.length === 0) {
      throw new Error('Failed to create or update card show');
    }
    
    const newShow = result[0];
    res.json({
      success: true,
      data: newShow
    });
  } catch (err) {
    console.error('Error adding card show:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to associate transactions with a show
async function associateTransactionsWithShow(showId, showDate) {
  try {
    // Associate sales on the same date
    await query(`
      UPDATE transactions 
      SET show_id = $1
      WHERE DATE(sale_date) = DATE($2) 
        AND show_id IS NULL
    `, [showId, showDate]);

    // Update inventory items purchased on the same date
    await query(`
      UPDATE inventory 
      SET purchase_show_id = $1
      WHERE DATE(purchase_date) = DATE($2) 
        AND purchase_show_id IS NULL
    `, [showId, showDate]);

    console.log(`Associated transactions with show ${showId} for date ${showDate}`);
  } catch (error) {
    console.error('Error associating transactions with show:', error);
  }
}

// Delete card show
router.delete('/card-shows/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Card show ID is required' });
    }

    // Check if show exists and belongs to user
    const showCheck = await query(`
      SELECT * FROM card_shows WHERE id = $1 AND user_id = $2
    `, [id, req.user.userId]);

    if (showCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Card show not found' });
    }

    // Delete the card show
    await query(`DELETE FROM card_shows WHERE id = $1 AND user_id = $2`, [id, req.user.userId]);

    // Remove associations from transactions
    await query(`UPDATE transactions SET show_id = NULL WHERE show_id = $1 AND user_id = $2`, [id, req.user.userId]);

    // Remove associations from inventory
    await query(`UPDATE inventory SET purchase_show_id = NULL WHERE purchase_show_id = $1 AND user_id = $2`, [id, req.user.userId]);

    res.json({
      success: true,
      message: 'Card show deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting card show:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
