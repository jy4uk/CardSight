import { query } from './services/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    console.log('✅ Card shows migration completed!');
    
    // Run multi-user migration
    console.log('\nRunning multi-user authentication migration...');
    const migrationPath = path.join(__dirname, 'migrations', 'add_multiuser_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration SQL
    await query(migrationSQL);
    
    console.log('✅ Multi-user migration completed!');
    
    // Run username migration
    console.log('\nRunning username column migration...');
    // const usernameMigrationPath = path.join(__dirname, 'migrations', 'add_username_column.sql');
    // const usernameMigrationSQL = fs.readFileSync(usernameMigrationPath, 'utf8');
    
    // // Execute the username migration SQL
    // await query(usernameMigrationSQL);
    
    // console.log('✅ Username migration completed!');
    
    // Run beta codes migration
    console.log('\nRunning beta codes migration...');
    const betaCodesMigrationPath = path.join(__dirname, 'migrations', 'add_beta_codes.sql');
    const betaCodesMigrationSQL = fs.readFileSync(betaCodesMigrationPath, 'utf8');
    
    // Execute the beta codes migration SQL
    await query(betaCodesMigrationSQL);
    
    console.log('✅ Beta codes migration completed!');

    // Run saved deals migration
    console.log('\nRunning saved deals migration...');
    const savedDealsMigrationPath = path.join(__dirname, 'migrations', 'add_saved_deals.sql');
    const savedDealsMigrationSQL = fs.readFileSync(savedDealsMigrationPath, 'utf8');
    
    // Execute the saved deals migration SQL
    await query(savedDealsMigrationSQL);
    
    console.log('✅ Saved deals migration completed!');

    // Run card shows user_id migration
    console.log('\nRunning card shows user_id migration...');
    const cardShowsUserIdMigrationPath = path.join(__dirname, 'migrations', 'add_user_id_to_card_shows.sql');
    const cardShowsUserIdMigrationSQL = fs.readFileSync(cardShowsUserIdMigrationPath, 'utf8');
    
    // Execute the card shows user_id migration SQL
    await query(cardShowsUserIdMigrationSQL);
    
    console.log('✅ Card shows user_id migration completed!');
    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
