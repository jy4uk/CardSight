import pg from 'pg';
import { config } from './config/index.js';

const pool = new pg.Pool({ connectionString: config.dbUrl });

const sql = `
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_inventory_hidden ON inventory(hidden);
`;

pool.query(sql).then(() => {
  console.log('Migration completed: hidden column added');
  pool.end();
}).catch(err => {
  console.error('Migration failed:', err.message);
  pool.end();
  process.exit(1);
});
