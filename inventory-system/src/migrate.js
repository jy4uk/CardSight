import { query } from './services/db.js';

async function runMigration() {
  try {
    console.log('Running card shows migration...');
    
    // Create card shows table
    await query(`
      CREATE TABLE IF NOT EXISTS card_shows (
        id SERIAL PRIMARY KEY,
        show_date DATE NOT NULL UNIQUE,
        show_name TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add show_id to transactions table
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS show_id INTEGER REFERENCES card_shows(id)`);
    
    // Add indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_card_shows_date ON card_shows(show_date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_show_id ON transactions(show_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_sale_date ON transactions(sale_date)`);
    
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
