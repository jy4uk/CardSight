-- Create card shows table
CREATE TABLE IF NOT EXISTS card_shows (
  id SERIAL PRIMARY KEY,
  show_date DATE NOT NULL UNIQUE,
  show_name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add show_id to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS show_id INTEGER REFERENCES card_shows(id);

-- Add index on show_date for performance
CREATE INDEX IF NOT EXISTS idx_card_shows_date ON card_shows(show_date);

-- Add index on transactions.show_id for performance
CREATE INDEX IF NOT EXISTS idx_transactions_show_id ON transactions(show_id);

-- Add index on transactions.sale_date for performance
CREATE INDEX IF NOT EXISTS idx_transactions_sale_date ON transactions(sale_date);
