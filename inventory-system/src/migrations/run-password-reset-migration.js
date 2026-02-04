import { query } from '../services/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running password reset migration...');
    
    const sqlPath = path.join(__dirname, 'add-password-reset-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added reset_token_hash column');
    console.log('   - Added reset_token_expiry column');
    console.log('   - Created index on reset_token_hash');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
