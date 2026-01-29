import { query } from './services/db.js';

async function runMigration() {
  try {
    console.log('Altering inventory table to allow NULL barcode_id...');
    
    await query(`ALTER TABLE inventory ALTER COLUMN barcode_id DROP NOT NULL`);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
