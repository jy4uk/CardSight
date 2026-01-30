-- Migration: Add tcg_product_id to inventory table for TCGplayer integration
-- This links inventory items to the TCG product catalog for images and pricing

-- Add tcg_product_id column to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tcg_product_id INTEGER;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_tcg_product_id ON inventory(tcg_product_id);

-- Ensure TCG tables have proper indexes (if not already)
CREATE INDEX IF NOT EXISTS idx_tcg_products_name ON "card-data-products-tcgcsv"(name);
CREATE INDEX IF NOT EXISTS idx_tcg_products_clean_name ON "card-data-products-tcgcsv"(clean_name);
CREATE INDEX IF NOT EXISTS idx_tcg_prices_product_id ON "card-data-prices-tcgcsv"(product_id);
