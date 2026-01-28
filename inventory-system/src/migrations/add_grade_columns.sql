-- Add grade and grade_qualifier columns to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grade_qualifier TEXT;

-- Add index for grade queries
CREATE INDEX IF NOT EXISTS idx_inventory_grade ON inventory(grade);
