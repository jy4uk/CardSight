-- Create products table for TCGCSV data
CREATE TABLE IF NOT EXISTS "card-data-products-tcgcsv" (
    "product_id" INTEGER PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "clean_name" VARCHAR(255),
    "image_url" TEXT,
    "category_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "url" TEXT,
    "modified_on" TIMESTAMP,
    "image_count" INTEGER,
    "presale_is_presale" BOOLEAN DEFAULT FALSE,
    "presale_released_on" TIMESTAMP,
    "presale_note" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add extended_data column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'card-data-products-tcgcsv' 
        AND column_name = 'extended_data'
    ) THEN
        ALTER TABLE "card-data-products-tcgcsv" ADD COLUMN "extended_data" JSONB;
    END IF;
END $$;

-- Create groups table for TCGCSV data
CREATE TABLE IF NOT EXISTS "card-data-groups-tcgcsv" (
    "group_id" INTEGER PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "abbreviation" VARCHAR(50),
    "is_supplemental" BOOLEAN DEFAULT FALSE,
    "published_on" TIMESTAMP,
    "modified_on" TIMESTAMP,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create prices table for TCGCSV data
CREATE TABLE IF NOT EXISTS "card-data-prices-tcgcsv" (
    "id" SERIAL PRIMARY KEY,
    "product_id" INTEGER NOT NULL,
    "low_price" DECIMAL(10,2),
    "mid_price" DECIMAL(10,2),
    "high_price" DECIMAL(10,2),
    "market_price" DECIMAL(10,2),
    "direct_low_price" DECIMAL(10,2),
    "sub_type_name" VARCHAR(50),
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("product_id") REFERENCES "card-data-products-tcgcsv"("product_id") ON DELETE CASCADE
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'card-data-prices-tcgcsv' 
        AND constraint_name = 'card-data-prices-tcgcsv_product_id_sub_type_name_key'
    ) THEN
        ALTER TABLE "card-data-prices-tcgcsv" 
        ADD CONSTRAINT "card-data-prices-tcgcsv_product_id_sub_type_name_key" 
        UNIQUE("product_id", "sub_type_name");
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_group_id ON "card-data-products-tcgcsv"("group_id");
CREATE INDEX IF NOT EXISTS idx_products_category_id ON "card-data-products-tcgcsv"("category_id");
CREATE INDEX IF NOT EXISTS idx_products_name ON "card-data-products-tcgcsv"("name");
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON "card-data-prices-tcgcsv"("product_id");
CREATE INDEX IF NOT EXISTS idx_prices_sub_type ON "card-data-prices-tcgcsv"("sub_type_name");

-- Create trigger function (only once)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers after tables exist
-- CREATE TRIGGER update_products_updated_at 
--     BEFORE UPDATE ON "card-data-products-tcgcsv" 
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_prices_updated_at 
--     BEFORE UPDATE ON "card-data-prices-tcgcsv" 
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
