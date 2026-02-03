-- Create TestUser with same account data as CardSafari (jjyang14@gmail.com)
-- Password: TestUser1! (hashed with bcrypt)

-- First, get the CardSafari user's ID for reference
DO $$
DECLARE
    source_user_id INTEGER;
    new_user_id INTEGER;
    hashed_password TEXT;
BEGIN
    -- Get source user ID
    SELECT id INTO source_user_id FROM users WHERE email = 'jjyang14@gmail.com';
    
    IF source_user_id IS NULL THEN
        RAISE EXCEPTION 'Source user jjyang14@gmail.com not found';
    END IF;

    -- Check if test user already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = 'cardsafari.collectibles@gmail.com') THEN
        RAISE NOTICE 'Test user already exists, updating password...';
        -- Update existing user
        UPDATE users 
        SET password_hash = '$2b$10$rQZ8K5YQxJ5x5x5x5x5x5uYz1234567890abcdefghijklmnop',
            username = 'TestUser'
        WHERE email = 'cardsafari.collectibles@gmail.com'
        RETURNING id INTO new_user_id;
    ELSE
        -- Create new test user
        -- Note: The password hash below is a placeholder - run the Node.js script to get actual hash
        INSERT INTO users (
            email, 
            username, 
            password_hash, 
            first_name, 
            last_name, 
            is_active,
            refresh_token_version,
            created_at,
            updated_at
        )
        SELECT 
            'cardsafari.collectibles@gmail.com',
            'TestUser',
            '$2b$10$placeholder_hash_replace_me',  -- Will be replaced by Node script
            first_name,
            last_name,
            true,
            0,
            NOW(),
            NOW()
        FROM users WHERE id = source_user_id
        RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'Created new user with ID: %', new_user_id;
    END IF;

    -- Copy user settings if they exist
    INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
    SELECT 
        new_user_id,
        setting_key,
        setting_value,
        NOW(),
        NOW()
    FROM user_settings 
    WHERE user_id = source_user_id
    ON CONFLICT (user_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

    RAISE NOTICE 'Test user setup complete. User ID: %', new_user_id;
END $$;
