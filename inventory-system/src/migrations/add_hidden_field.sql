-- Migration: Add hidden field to inventory table
-- Used to hide cards from public inventory (e.g., for grading candidates or personal collection)

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Create index for filtering hidden items
CREATE INDEX IF NOT EXISTS idx_inventory_hidden ON inventory(hidden);
