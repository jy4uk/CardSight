-- Add user_id column to card_shows table
ALTER TABLE card_shows ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Drop the old unique constraint on show_date alone (if it exists)
ALTER TABLE card_shows DROP CONSTRAINT IF EXISTS card_shows_show_date_key;

-- Add a composite unique constraint on (user_id, show_date) so each user can have their own shows
ALTER TABLE card_shows ADD CONSTRAINT card_shows_user_date_unique UNIQUE (user_id, show_date);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_card_shows_user_id ON card_shows(user_id);
