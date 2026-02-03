import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({ connectionString: config.dbUrl });

/**
 * Typed database query function
 * @param sql SQL query string
 * @param params Query parameters
 * @returns Array of typed results
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Execute query within a transaction
 * @param callback Function that performs queries within the transaction
 * @returns Result from the callback
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to execute a query within a transaction context
 */
export async function queryInTransaction<T = any>(
  client: pg.PoolClient,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const res = await client.query(sql, params);
  return res.rows as T[];
}
