import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;
export const pool = new Pool({ connectionString: config.dbUrl });

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}