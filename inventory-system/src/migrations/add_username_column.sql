-- Add username column to users table
-- This migration adds username support and makes password_hash nullable for future OAuth

-- Add username column (nullable initially to allow existing users)
ALTER TABLE users ADD COLUMN username VARCHAR(50);

-- Make password_hash nullable for future OAuth support
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX idx_users_username_lower ON users(LOWER(username));

-- Add check constraint for username format (alphanumeric, underscore, hyphen only)
ALTER TABLE users ADD CONSTRAINT username_format 
  CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$');

-- Add comments for documentation
COMMENT ON COLUMN users.username IS 'Unique username for user profile URLs and identification';
COMMENT ON COLUMN users.password_hash IS 'Password hash - nullable to support OAuth authentication';
