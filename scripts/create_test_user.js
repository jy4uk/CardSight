/**
 * Create TestUser with same account data as CardSafari (jjyang14@gmail.com)
 * 
 * Run from inventory-system folder: node ../scripts/create_test_user.js
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    // Test user credentials
    const email = 'cardsafari.collectibles@gmail.com';
    const username = 'TestUser';
    const password = 'TestUser1!';
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');
    
    // Get source user (CardSafari)
    const sourceResult = await client.query(
      "SELECT * FROM users WHERE email = 'jjyang14@gmail.com'"
    );
    
    if (sourceResult.rows.length === 0) {
      throw new Error('Source user jjyang14@gmail.com not found');
    }
    
    const sourceUser = sourceResult.rows[0];
    console.log(`Found source user: ${sourceUser.username} (ID: ${sourceUser.id})`);
    
    // Check if test user already exists
    const existingResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    let newUserId;
    
    if (existingResult.rows.length > 0) {
      // Update existing user
      const updateResult = await client.query(
        `UPDATE users 
         SET password_hash = $1, username = $2, updated_at = NOW()
         WHERE email = $3
         RETURNING id`,
        [passwordHash, username, email]
      );
      newUserId = updateResult.rows[0].id;
      console.log(`Updated existing test user (ID: ${newUserId})`);
    } else {
      // Create new user
      const insertResult = await client.query(
        `INSERT INTO users (
           email, username, password_hash, first_name, last_name, 
           is_active, refresh_token_version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, true, 0, NOW(), NOW())
         RETURNING id`,
        [email, username, passwordHash, sourceUser.first_name, sourceUser.last_name]
      );
      newUserId = insertResult.rows[0].id;
      console.log(`Created new test user (ID: ${newUserId})`);
    }
    
    // Copy user settings if the table exists
    try {
      await client.query(
        `INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
         SELECT $1, setting_key, setting_value, NOW(), NOW()
         FROM user_settings 
         WHERE user_id = $2
         ON CONFLICT (user_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
        [newUserId, sourceUser.id]
      );
      console.log('Copied user settings');
    } catch (e) {
      console.log('No user_settings table or no settings to copy');
    }
    
    // Copy user features if the table exists
    try {
      await client.query(
        `INSERT INTO user_features (user_id, feature_key, enabled, created_at)
         SELECT $1, feature_key, enabled, NOW()
         FROM user_features 
         WHERE user_id = $2
         ON CONFLICT (user_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled`,
        [newUserId, sourceUser.id]
      );
      console.log('Copied user features');
    } catch (e) {
      console.log('No user_features table or no features to copy');
    }

    // Copy inventory items (create new items with new user_id)
    console.log('\nCopying inventory items...');
    const inventoryResult = await client.query(
      `INSERT INTO inventory (
         user_id, card_name, set_name, card_number, game, card_type,
         purchase_price, front_label_price, condition,
         cert_number, grade, grade_qualifier, image_url, status,
         purchase_date, series, tcg_product_id, hidden, notes
       )
       SELECT 
         $1, card_name, set_name, card_number, game, card_type,
         purchase_price, front_label_price, condition,
         cert_number, grade, grade_qualifier, image_url, status,
         purchase_date, series, tcg_product_id, hidden, notes
       FROM inventory 
       WHERE user_id = $2
       RETURNING id`,
      [newUserId, sourceUser.id]
    );
    console.log(`Copied ${inventoryResult.rows.length} inventory items`);

    // Copy trades
    console.log('Copying trades...');
    const tradesResult = await client.query(
      `INSERT INTO trades (
         user_id, customer_name, trade_date, trade_percentage,
         trade_in_total, trade_in_value, trade_out_total,
         cash_to_customer, cash_from_customer, notes, show_id, created_at
       )
       SELECT 
         $1, customer_name, trade_date, trade_percentage,
         trade_in_total, trade_in_value, trade_out_total,
         cash_to_customer, cash_from_customer, notes, show_id, created_at
       FROM trades 
       WHERE user_id = $2
       RETURNING id`,
      [newUserId, sourceUser.id]
    );
    console.log(`Copied ${tradesResult.rows.length} trades`);

    // Copy saved deals
    console.log('Copying saved deals...');
    const savedDealsResult = await client.query(
      `INSERT INTO saved_deals (
         user_id, deal_type, customer_name, customer_note, deal_data,
         total_items, total_value, trade_out_inventory_ids, 
         expires_at, show_id, created_at, updated_at
       )
       SELECT 
         $1, deal_type, customer_name, customer_note, deal_data,
         total_items, total_value, NULL,
         expires_at, show_id, created_at, updated_at
       FROM saved_deals 
       WHERE user_id = $2
       RETURNING id`,
      [newUserId, sourceUser.id]
    );
    console.log(`Copied ${savedDealsResult.rows.length} saved deals`);
    
    console.log('\n✅ Test user created successfully!');
    console.log('----------------------------------------');
    console.log(`Email: ${email}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${newUserId}`);
    console.log('----------------------------------------');
    
  } catch (error) {
    console.error('Error creating test user:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser().catch(console.error);
