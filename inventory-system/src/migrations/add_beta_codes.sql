-- Beta Access System Migration
-- Create beta_codes table for controlling signup access

CREATE TABLE IF NOT EXISTS beta_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_beta_codes_code ON beta_codes(code);
CREATE INDEX IF NOT EXISTS idx_beta_codes_is_used ON beta_codes(is_used);

-- Insert initial beta codes (50 randomized codes)
INSERT INTO beta_codes (code, created_by, notes) VALUES
  ('CP-7K9M-X4H2-P8WQ', 'system', 'Initial beta batch'),
  ('CP-3N6R-T9VF-L2BJ', 'system', 'Initial beta batch'),
  ('CP-5D8G-Y1MZ-K7NX', 'system', 'Initial beta batch'),
  ('CP-2W4Q-H6TP-R9CV', 'system', 'Initial beta batch'),
  ('CP-8F1L-M3XJ-N5DK', 'system', 'Initial beta batch'),
  ('CP-6V9B-P2GH-T4WM', 'system', 'Initial beta batch'),
  ('CP-4R7N-Z8KL-Q1FX', 'system', 'Initial beta batch'),
  ('CP-1M5J-C3VB-H9TP', 'system', 'Initial beta batch'),
  ('CP-9X2D-W6NK-L8RG', 'system', 'Initial beta batch'),
  ('CP-7H4P-F1QM-V3ZJ', 'system', 'Initial beta batch'),
  ('CP-3K8T-B5WX-N2DL', 'system', 'Initial beta batch'),
  ('CP-6Q1R-M9HG-P7VK', 'system', 'Initial beta batch'),
  ('CP-2L7F-X4JN-T8CW', 'system', 'Initial beta batch'),
  ('CP-8N3V-K6RM-H1QZ', 'system', 'Initial beta batch'),
  ('CP-5W9D-P2BL-F7XM', 'system', 'Initial beta batch'),
  ('CP-4T6H-N8VK-Q3GJ', 'system', 'Initial beta batch'),
  ('CP-1R5M-Z7WP-L9BX', 'system', 'Initial beta batch'),
  ('CP-9G2K-H4TN-V6FD', 'system', 'Initial beta batch'),
  ('CP-7B8Q-M1XL-P5RW', 'system', 'Initial beta batch'),
  ('CP-3V4N-T9KH-Z2JG', 'system', 'Initial beta batch'),
  ('CP-6F1W-R7DM-K8PL', 'system', 'Initial beta batch'),
  ('CP-2X9H-L3VN-Q6TB', 'system', 'Initial beta batch'),
  ('CP-8D5K-P4GW-M1ZR', 'system', 'Initial beta batch'),
  ('CP-5J7R-N2BX-H9VF', 'system', 'Initial beta batch'),
  ('CP-4M1T-W8KP-L6QD', 'system', 'Initial beta batch'),
  ('CP-9P6N-V3HZ-R2XK', 'system', 'Initial beta batch'),
  ('CP-7L2G-K5TM-F8WJ', 'system', 'Initial beta batch'),
  ('CP-1W8V-Q4NB-P7DH', 'system', 'Initial beta batch'),
  ('CP-6H3R-M9XL-T1KG', 'system', 'Initial beta batch'),
  ('CP-3Q5F-Z7WK-N4VP', 'system', 'Initial beta batch'),
  ('CP-8K9M-B2HL-X6RJ', 'system', 'Initial beta batch'),
  ('CP-2T4N-P1GV-W8ZD', 'system', 'Initial beta batch'),
  ('CP-5R7X-L6KM-Q3FH', 'system', 'Initial beta batch'),
  ('CP-9V1W-H8TP-N5BK', 'system', 'Initial beta batch'),
  ('CP-4D6Q-M3ZR-L9XG', 'system', 'Initial beta batch'),
  ('CP-7N2K-V5WH-P8JT', 'system', 'Initial beta batch'),
  ('CP-1F8L-R4BN-M6QX', 'system', 'Initial beta batch'),
  ('CP-6X3P-T9KD-H2VW', 'system', 'Initial beta batch'),
  ('CP-3M7G-Z1RL-K5FN', 'system', 'Initial beta batch'),
  ('CP-8W5H-N6QP-V4BJ', 'system', 'Initial beta batch'),
  ('CP-2B9T-L7XK-R1MG', 'system', 'Initial beta batch'),
  ('CP-5P4V-K2WN-H8DQ', 'system', 'Initial beta batch'),
  ('CP-9L6R-F3TM-Z7XH', 'system', 'Initial beta batch'),
  ('CP-4G1N-P8VK-W5QJ', 'system', 'Initial beta batch'),
  ('CP-7T3X-M6BL-N9RD', 'system', 'Initial beta batch'),
  ('CP-1K8W-H4ZP-L2VF', 'system', 'Initial beta batch'),
  ('CP-6R5M-Q9GN-T3XK', 'system', 'Initial beta batch'),
  ('CP-3H7D-V2KW-P6BL', 'system', 'Initial beta batch'),
  ('CP-8Q2F-N5XR-M1TG', 'system', 'Initial beta batch'),
  ('CP-2Z6K-W9HL-V4PJ', 'system', 'Initial beta batch')
ON CONFLICT (code) DO NOTHING;

-- Add comment
COMMENT ON TABLE beta_codes IS 'Beta access codes for controlling signup during beta phase';
