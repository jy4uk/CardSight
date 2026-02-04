-- Phase 1 Multi-User Migration
-- Add users table and user_id columns to existing tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  refresh_token_version INTEGER DEFAULT 0,
  reset_token_hash VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add user_id columns to existing tables NOT NULL DEFAULT 1
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE card_shows ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_status ON inventory(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_card_shows_user_id ON card_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_card_shows_user_date ON card_shows(user_id, show_date);

-- Create a default admin user (password: admin123 - should be changed in production)
-- INSERT INTO users (email, password_hash, first_name, last_name) 
-- VALUES ('jjyang14@gmail.com', '$2b$10$rQZ8ZqGQJqKqQqQqQqQqQu', 'Admin', 'User')
-- ON CONFLICT (email) DO NOTHING;

-- Create trigger to update updated_at column for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Already exists in table, uncomment if need to recreate
-- CREATE TRIGGER update_users_updated_at 
--     BEFORE UPDATE ON users 
--     FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts for multi-tenant CardSight application';
COMMENT ON COLUMN inventory.user_id IS 'Foreign key to users table for multi-tenant data isolation';
COMMENT ON COLUMN transactions.user_id IS 'Foreign key to users table for multi-tenant data isolation';
COMMENT ON COLUMN trades.user_id IS 'Foreign key to users table for multi-tenant data isolation';
COMMENT ON COLUMN card_shows.user_id IS 'Foreign key to users table for multi-tenant data isolation';
