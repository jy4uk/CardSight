-- Add a new card show
-- Replace the values below with your actual card show details

INSERT INTO card_shows (show_name, location, show_date) 
VALUES (
  'Your Card Show Name',           -- e.g., 'Pokemon Regional Championship'
  'Your Location',                 -- e.g., 'Los Angeles Convention Center'
  '2025-02-15'                     -- e.g., '2025-02-15' (YYYY-MM-DD format)
);

-- Add multiple card shows at once
INSERT INTO card_shows (show_name, location, show_date) VALUES
  ('Pokemon Regional Championship', 'Los Angeles Convention Center', '2025-02-15'),
  ('Magic: The Gathering Grand Prix', 'Seattle Center', '2025-03-20'),
  ('Yu-Gi-Oh! Championship Series', 'Dallas Convention Center', '2025-04-10'),
  ('One Piece Card Fest', 'Anime Expo Center', '2025-05-25');

-- View all card shows to verify
SELECT * FROM card_shows ORDER BY show_date DESC;
