import { query } from './services/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    // ── Step 1: Base schema (must exist before any ALTER TABLEs) ──
    console.log('Creating base tables (if not exist)...');

    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        barcode_id TEXT UNIQUE NOT NULL,
        card_name TEXT,
        set_name TEXT,
        series TEXT,
        game TEXT DEFAULT 'pokemon',
        card_type TEXT DEFAULT 'raw',
        cert_number TEXT,
        card_number TEXT,
        condition TEXT,
        grade TEXT,
        grade_qualifier TEXT,
        purchase_price NUMERIC(10,2),
        purchase_date TIMESTAMP,
        front_label_price NUMERIC(10,2),
        sale_price NUMERIC(10,2),
        sale_date TIMESTAMP,
        status TEXT DEFAULT 'PLANNED',
        image_url TEXT,
        notes TEXT,
        tcg_product_id INTEGER
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory(id),
        stripe_payment_intent_id TEXT,
        sale_price NUMERIC(10,2),
        fees NUMERIC(10,2),
        net_amount NUMERIC(10,2),
        sale_date TIMESTAMP,
        payment_method TEXT
      )
    `);

    console.log('✅ Base tables ready!');

    // ── Step 2: Card shows ──
    console.log('\nRunning card shows migration...');
    
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
    
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS show_id INTEGER REFERENCES card_shows(id)`);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_card_shows_date ON card_shows(show_date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_show_id ON transactions(show_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_sale_date ON transactions(sale_date)`);
    
    console.log('✅ Card shows migration completed!');
    
    // ── Step 3: Multi-user auth ──
    console.log('\nRunning multi-user authentication migration...');
    const migrationPath = path.join(__dirname, 'migrations', 'add_multiuser_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await query(migrationSQL);
    
    console.log('✅ Multi-user migration completed!');
    
    // ── Step 4: Username column (required for login) ──
    console.log('\nRunning username column migration...');
    const usernameMigrationPath = path.join(__dirname, 'migrations', 'add_username_column.sql');
    const usernameMigrationSQL = fs.readFileSync(usernameMigrationPath, 'utf8');
    
    await query(usernameMigrationSQL);
    
    console.log('✅ Username migration completed!');
    
    // ── Step 5: Beta codes ──
    console.log('\nRunning beta codes migration...');
    const betaCodesMigrationPath = path.join(__dirname, 'migrations', 'add_beta_codes.sql');
    const betaCodesMigrationSQL = fs.readFileSync(betaCodesMigrationPath, 'utf8');
    
    await query(betaCodesMigrationSQL);
    
    console.log('✅ Beta codes migration completed!');

    // ── Step 6: Saved deals ──
    console.log('\nRunning saved deals migration...');
    const savedDealsMigrationPath = path.join(__dirname, 'migrations', 'add_saved_deals.sql');
    const savedDealsMigrationSQL = fs.readFileSync(savedDealsMigrationPath, 'utf8');
    
    await query(savedDealsMigrationSQL);
    
    console.log('✅ Saved deals migration completed!');

    // ── Step 7: Card shows user_id ──
    console.log('\nRunning card shows user_id migration...');
    const cardShowsUserIdMigrationPath = path.join(__dirname, 'migrations', 'add_user_id_to_card_shows.sql');
    const cardShowsUserIdMigrationSQL = fs.readFileSync(cardShowsUserIdMigrationPath, 'utf8');
    
    await query(cardShowsUserIdMigrationSQL);
    
    console.log('✅ Card shows user_id migration completed!');

    // ── Step 8: Trades ──
    console.log('\nRunning trades schema migration...');
    const tradesSqlPath = path.join(__dirname, 'schema-trades.sql');
    if (fs.existsSync(tradesSqlPath)) {
      const tradesSQL = fs.readFileSync(tradesSqlPath, 'utf8');
      await query(tradesSQL);
      console.log('✅ Trades schema completed!');
    } else {
      // Inline fallback
      await query(`
        CREATE TABLE IF NOT EXISTS trades (
          id SERIAL PRIMARY KEY,
          trade_date TIMESTAMP DEFAULT NOW(),
          customer_name TEXT,
          trade_percentage NUMERIC(5,2) DEFAULT 80.00,
          trade_in_total NUMERIC(10,2) DEFAULT 0,
          trade_in_value NUMERIC(10,2) DEFAULT 0,
          trade_out_total NUMERIC(10,2) DEFAULT 0,
          cash_to_customer NUMERIC(10,2) DEFAULT 0,
          cash_from_customer NUMERIC(10,2) DEFAULT 0,
          notes TEXT,
          show_id INTEGER REFERENCES card_shows(id),
          created_at TIMESTAMP DEFAULT NOW(),
          user_id INTEGER REFERENCES users(id)
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS trade_items (
          id SERIAL PRIMARY KEY,
          trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
          inventory_id INTEGER REFERENCES inventory(id),
          direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
          card_name TEXT,
          set_name TEXT,
          card_value NUMERIC(10,2),
          trade_value NUMERIC(10,2),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Trades schema completed (inline)!');
    }

    // ── Step 9: Password reset fields ──
    console.log('\nRunning password reset fields migration...');
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash)`);
    console.log('✅ Password reset fields completed!');

    console.log('\n🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
