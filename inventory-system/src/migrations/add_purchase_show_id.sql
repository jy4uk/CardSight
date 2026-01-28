-- Add purchase_show_id column to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_show_id INTEGER REFERENCES card_shows(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_show_id ON inventory(purchase_show_id);
