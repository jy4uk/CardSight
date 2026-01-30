-- Migration: Add series column to inventory table
-- Run this on your production database

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS series TEXT;

-- Optional: Add index for filtering by series
CREATE INDEX IF NOT EXISTS idx_inventory_series ON inventory(series);
