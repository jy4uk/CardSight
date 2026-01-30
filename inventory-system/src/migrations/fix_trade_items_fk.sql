-- Migration: Fix trade_items foreign key to allow inventory deletion
-- Changes ON DELETE behavior to SET NULL so trade history is preserved

-- Drop the existing constraint
ALTER TABLE trade_items DROP CONSTRAINT IF EXISTS trade_items_inventory_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE trade_items 
ADD CONSTRAINT trade_items_inventory_id_fkey 
FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE SET NULL;
