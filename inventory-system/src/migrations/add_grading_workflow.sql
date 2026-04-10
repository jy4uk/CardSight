-- Grading workflow: track cards sent for grading
-- grading_status: NULL (not at grading), 'submitted' (sent to grading company)
-- grading_cost: cost paid for grading this card
-- grading_date_submitted: when the card was sent for grading

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grading_status TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grading_cost NUMERIC(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grading_date_submitted TIMESTAMP;

-- Index for filtering cards at grading
CREATE INDEX IF NOT EXISTS idx_inventory_grading_status ON inventory(user_id, grading_status) WHERE grading_status IS NOT NULL;
