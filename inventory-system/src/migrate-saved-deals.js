import { query } from './services/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_saved_deals.sql'),
      'utf8'
    );
    
    await query(sql);
    console.log('✅ Saved deals migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
