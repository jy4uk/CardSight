-- Saved deals table to store pending purchase/trade quotes for customers
CREATE TABLE IF NOT EXISTS saved_deals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('purchase', 'trade')),
  customer_name TEXT,
  customer_note TEXT,
  
  -- Deal data stored as JSON for flexibility
  deal_data JSONB NOT NULL,
  
  -- Calculated totals for quick display
  total_items INTEGER DEFAULT 0,
  total_value NUMERIC(10,2) DEFAULT 0,
  
  -- For trades: track trade-out inventory IDs to check availability
  trade_out_inventory_ids INTEGER[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Optional expiration date
  
  show_id INTEGER REFERENCES card_shows(id)
);

-- Add user_id if table already exists
ALTER TABLE saved_deals ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_deals_user ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_type ON saved_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_saved_deals_customer ON saved_deals(customer_name);
CREATE INDEX IF NOT EXISTS idx_saved_deals_created ON saved_deals(created_at DESC);
