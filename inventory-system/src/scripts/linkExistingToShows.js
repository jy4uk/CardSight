/**
 * Backfill script to link existing trades and inventory to card shows
 * Run this once to retroactively associate transactions with shows based on date
 */

import { query } from '../services/db.js';

async function linkExistingTradesToShows() {
  console.log('Linking existing trades to card shows...');
  
  // Find trades without show_id that have a matching card show date
  const tradesToLink = await query(`
    SELECT t.id, t.trade_date, t.user_id, cs.id as show_id
    FROM trades t
    JOIN card_shows cs ON DATE(t.trade_date) = DATE(cs.show_date) AND t.user_id = cs.user_id
    WHERE t.show_id IS NULL
  `);
  
  console.log(`Found ${tradesToLink.length} trades to link`);
  
  let linked = 0;
  for (const trade of tradesToLink) {
    try {
      await query(
        `UPDATE trades SET show_id = $1 WHERE id = $2`,
        [trade.show_id, trade.id]
      );
      linked++;
      console.log(`  Linked trade ${trade.id} to show ${trade.show_id}`);
    } catch (err) {
      console.error(`  Failed to link trade ${trade.id}:`, err.message);
    }
  }
  
  console.log(`Successfully linked ${linked} trades\n`);
  return linked;
}

async function linkExistingInventoryToShows() {
  console.log('Linking existing inventory purchases to card shows...');
  
  // Find inventory items without purchase_show_id that have a matching card show date
  const itemsToLink = await query(`
    SELECT i.id, i.purchase_date, i.user_id, cs.id as show_id
    FROM inventory i
    JOIN card_shows cs ON DATE(i.purchase_date) = DATE(cs.show_date) AND i.user_id = cs.user_id
    WHERE i.purchase_show_id IS NULL
      AND i.purchase_date IS NOT NULL
  `);
  
  console.log(`Found ${itemsToLink.length} inventory items to link`);
  
  let linked = 0;
  for (const item of itemsToLink) {
    try {
      await query(
        `UPDATE inventory SET purchase_show_id = $1 WHERE id = $2`,
        [item.show_id, item.id]
      );
      linked++;
      console.log(`  Linked item ${item.id} to show ${item.show_id}`);
    } catch (err) {
      console.error(`  Failed to link item ${item.id}:`, err.message);
    }
  }
  
  console.log(`Successfully linked ${linked} inventory items\n`);
  return linked;
}

async function linkExistingSalesToShows() {
  console.log('Linking existing sales to card shows...');
  
  // Find transactions without show_id that have a matching card show date
  const salesToLink = await query(`
    SELECT t.id, t.sale_date, i.user_id, cs.id as show_id
    FROM transactions t
    JOIN inventory i ON t.inventory_id = i.id
    JOIN card_shows cs ON DATE(t.sale_date) = DATE(cs.show_date) AND i.user_id = cs.user_id
    WHERE t.show_id IS NULL
  `);
  
  console.log(`Found ${salesToLink.length} sales to link`);
  
  let linked = 0;
  for (const sale of salesToLink) {
    try {
      await query(
        `UPDATE transactions SET show_id = $1 WHERE id = $2`,
        [sale.show_id, sale.id]
      );
      linked++;
      console.log(`  Linked sale ${sale.id} to show ${sale.show_id}`);
    } catch (err) {
      console.error(`  Failed to link sale ${sale.id}:`, err.message);
    }
  }
  
  console.log(`Successfully linked ${linked} sales\n`);
  return linked;
}

async function main() {
  console.log('=== Card Show Linking Backfill ===\n');
  
  try {
    const tradesLinked = await linkExistingTradesToShows();
    const inventoryLinked = await linkExistingInventoryToShows();
    const salesLinked = await linkExistingSalesToShows();
    
    console.log('=== Summary ===');
    console.log(`Trades linked: ${tradesLinked}`);
    console.log(`Inventory items linked: ${inventoryLinked}`);
    console.log(`Sales linked: ${salesLinked}`);
    console.log('\nBackfill complete!');
    
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

main();
