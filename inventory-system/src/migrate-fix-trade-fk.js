import pg from 'pg';
import { config } from './config/index.js';

const pool = new pg.Pool({ connectionString: config.dbUrl });

const sql = `
-- Drop the existing constraint
ALTER TABLE trade_items DROP CONSTRAINT IF EXISTS trade_items_inventory_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE trade_items 
ADD CONSTRAINT trade_items_inventory_id_fkey 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;
`;

pool.query(sql).then(() => {
  console.log('Migration completed: trade_items FK updated to ON DELETE SET NULL');
  pool.end();
}).catch(err => {
  console.error('Migration failed:', err.message);
  pool.end();
  process.exit(1);
});
