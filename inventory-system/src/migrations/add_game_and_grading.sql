-- Migration: Add game, card_type, and cert_number columns to inventory table
-- Run this migration on your existing database

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS game TEXT DEFAULT 'pokemon';

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'raw';

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS cert_number TEXT;

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS card_number TEXT;

-- Create index on game for faster filtering
CREATE INDEX IF NOT EXISTS idx_inventory_game ON inventory(game);

-- Create index on card_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_inventory_card_type ON inventory(card_type);
