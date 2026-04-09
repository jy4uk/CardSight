-- Add collection_type column to inventory table
-- 'inventory' = items for sale/trade (default, all existing items)
-- 'collection' = personal collection items (can still be sold/traded)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS collection_type TEXT DEFAULT 'inventory';

-- Index for filtering by collection_type
CREATE INDEX IF NOT EXISTS idx_inventory_collection_type ON inventory(user_id, collection_type);
