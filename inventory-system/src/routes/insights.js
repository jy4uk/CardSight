import express from 'express';
import { query } from '../services/db.js';

const router = express.Router();

// Get business insights and metrics
router.get('/', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    let dateFilter = '';
    const now = new Date();
    switch (timeRange) {
      case '7d':
        dateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '7 days'`;
        break;
      case '30d':
        dateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '30 days'`;
        break;
      case '90d':
        dateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '90 days'`;
        break;
      case '1y':
        dateFilter = `AND transactions.sale_date >= NOW() - INTERVAL '1 year'`;
        break;
      default:
        dateFilter = '';
    }

    // Get inventory metrics
    const inventoryStats = await query(`
      SELECT 
        COUNT(*) as total_inventory,
        COALESCE(SUM(front_label_price), 0) as total_value,
        AVG(front_label_price) as avg_price
      FROM inventory 
      WHERE status = 'IN_STOCK'
    `);

    // Get sales metrics
    const salesStats = await query(`
      SELECT 
        COUNT(*) as items_sold,
        COALESCE(SUM(transactions.sale_price), 0) as total_revenue,
        COALESCE(SUM(transactions.sale_price - inventory.purchase_price), 0) as total_profit,
        AVG(transactions.sale_price) as avg_sale_price
      FROM transactions
      JOIN inventory ON transactions.inventory_id = inventory.id
      WHERE 1=1 ${dateFilter}
    `);

    // Get sales trend data (daily)
    const salesTrend = await query(`
      SELECT 
        DATE(transactions.sale_date) as date,
        COUNT(*) as sales_count,
        SUM(transactions.sale_price) as revenue,
        SUM(transactions.sale_price - inventory.purchase_price) as profit
      FROM transactions
      JOIN inventory ON transactions.inventory_id = inventory.id
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(transactions.sale_date)
      ORDER BY date DESC
      LIMIT 30
    `);

    // Get inventory distribution by game
    const gameDistribution = await query(`
      SELECT 
        game,
        COUNT(*) as count,
        COALESCE(SUM(front_label_price), 0) as value
      FROM inventory 
      WHERE status = 'IN_STOCK'
      GROUP BY game
      ORDER BY count DESC
    `);

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
      WHERE status = 'IN_STOCK'
      GROUP BY 
        CASE 
          WHEN card_type = 'raw' THEN 'Singles'
          ELSE card_type || ' Slabs'
        END
      ORDER BY count DESC
    `);

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
      LEFT JOIN transactions t ON cs.id = t.show_id
      LEFT JOIN inventory i ON t.inventory_id = i.id
      GROUP BY cs.id, cs.show_date, cs.show_name, cs.location
      ORDER BY cs.show_date DESC
    `);

    // Get recent sales with card show information
    const recentSales = await query(`
      SELECT 
        transactions.sale_price,
        transactions.sale_date,
        (transactions.sale_price - inventory.purchase_price) as profit,
        inventory.card_name,
        inventory.set_name,
        inventory.game,
        inventory.purchase_date,
        GREATEST(0, EXTRACT(EPOCH FROM (transactions.sale_date - inventory.purchase_date)) / 86400) as days_in_inventory,
        COALESCE(card_shows.show_name, 'Direct Sale') as show_name,
        COALESCE(card_shows.location, '') as location,
        transactions.show_id,
        COALESCE(purchase_shows.show_name, '') as purchase_show_name
      FROM transactions
      JOIN inventory ON transactions.inventory_id = inventory.id
      LEFT JOIN card_shows ON transactions.show_id = card_shows.id
      LEFT JOIN card_shows AS purchase_shows ON inventory.purchase_show_id = purchase_shows.id
      ORDER BY transactions.sale_date DESC
      LIMIT 10
    `);

    // Calculate profit margin and time metrics
    const totalRevenue = salesStats[0]?.total_revenue || 0;
    const totalProfit = salesStats[0]?.total_profit || 0;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
    
    // Calculate average time in inventory for sold items
    console.log('Recent sales for avg time calculation:', recentSales.map(s => ({
      cardName: s.card_name,
      daysInInventory: s.days_in_inventory,
      purchaseDate: s.purchase_date,
      saleDate: s.sale_date
    })));
    
    const avgTimeInInventory = recentSales.length > 0 
      ? recentSales.reduce((sum, sale) => sum + (Number(sale.days_in_inventory) || 0), 0) / recentSales.length 
      : 0;
    
    console.log('Calculated avg time in inventory:', avgTimeInInventory);

    const metrics = {
      totalInventory: Number(inventoryStats[0]?.total_inventory || 0),
      totalValue: Number(inventoryStats[0]?.total_value || 0),
      itemsSold: Number(salesStats[0]?.items_sold || 0),
      totalRevenue: Number(totalRevenue),
      totalProfit: Number(totalProfit),
      profitMargin: Number(profitMargin.toFixed(1)),
      avgSalePrice: Number(salesStats[0]?.avg_sale_price || 0),
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
      recentSales: recentSales.map(row => ({
        salePrice: Number(row.sale_price),
        profit: Number(row.profit),
        saleDate: row.sale_date,
        purchaseDate: row.purchase_date,
        daysInInventory: Number(row.days_in_inventory || 0),
        cardName: row.card_name,
        setName: row.set_name,
        game: row.game,
        showName: row.show_name,
        location: row.location,
        showId: row.show_id,
        purchaseShowName: row.purchase_show_name
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
router.post('/card-shows', async (req, res) => {
  try {
    const { showName, location, showDate } = req.body;
    
    if (!showName || !location || !showDate) {
      return res.status(400).json({ success: false, error: 'Show name, location, and date are required' });
    }

    let result;
    
    try {
      // Try to insert new show
      result = await query(`
        INSERT INTO card_shows (show_name, location, show_date)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [showName, location, showDate]);
    } catch (insertError) {
      // If it's a duplicate key error (show_date already exists), update existing show
      if (insertError.code === '23505') {
        const updateResult = await query(`
          UPDATE card_shows 
          SET show_name = $1, location = $2
          WHERE show_date = $3
          RETURNING *
        `, [showName, location, showDate]);
        
        result = updateResult;
      } else {
        // Re-throw other errors
        throw insertError;
      }
    }

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Failed to create or update card show');
    }
    
    const newShow = result.rows[0];
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
router.delete('/card-shows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Card show ID is required' });
    }

    // Check if show exists
    const showCheck = await query(`
      SELECT * FROM card_shows WHERE id = $1
    `, [id]);

    if (showCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Card show not found' });
    }

    // Delete the card show
    await query(`DELETE FROM card_shows WHERE id = $1`, [id]);

    // Remove associations from transactions
    await query(`UPDATE transactions SET show_id = NULL WHERE show_id = $1`, [id]);

    // Remove associations from inventory
    await query(`UPDATE inventory SET purchase_show_id = NULL WHERE purchase_show_id = $1`, [id]);

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
