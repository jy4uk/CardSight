import { query } from './services/db.js';

async function addPurchaseShowIdColumn() {
  try {
    console.log('Adding purchase_show_id column to inventory table...');
    
    // Add purchase_show_id column
    await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_show_id INTEGER REFERENCES card_shows(id)`);
    console.log('✓ Added purchase_show_id column');
    
    // Add index for faster queries
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_purchase_show_id ON inventory(purchase_show_id)`);
    console.log('✓ Added purchase_show_id index');
    
    console.log('✅ Purchase show ID migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

addPurchaseShowIdColumn();
