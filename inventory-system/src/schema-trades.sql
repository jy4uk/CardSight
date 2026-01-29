-- Trades table to track card trade transactions
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  trade_date TIMESTAMP DEFAULT NOW(),
  customer_name TEXT,
  trade_percentage NUMERIC(5,2) DEFAULT 80.00,
  trade_in_total NUMERIC(10,2) DEFAULT 0,
  trade_in_value NUMERIC(10,2) DEFAULT 0,
  trade_out_total NUMERIC(10,2) DEFAULT 0,
  cash_to_customer NUMERIC(10,2) DEFAULT 0,
  cash_from_customer NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  show_id INTEGER REFERENCES card_shows(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trade items table to track individual cards in each trade
CREATE TABLE IF NOT EXISTS trade_items (
  id SERIAL PRIMARY KEY,
  trade_id INTEGER REFERENCES trades(id) ON DELETE CASCADE,
  inventory_id INTEGER REFERENCES inventory(id),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  card_name TEXT,
  set_name TEXT,
  card_value NUMERIC(10,2),
  trade_value NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add status 'TRADED' to inventory items that are traded out
-- Already handled by existing status column

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_customer ON trades(customer_name);
CREATE INDEX IF NOT EXISTS idx_trade_items_trade_id ON trade_items(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_items_inventory_id ON trade_items(inventory_id);
