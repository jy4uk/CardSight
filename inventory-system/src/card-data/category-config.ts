// TCGCSV Category Configuration
// Available categories:
// 1: Baseball
// 2: Basketball  
// 3: Pokemon
// 4: Magic: The Gathering
// 17: Fighting Games
// 68: One Piece
// 85: Pokemon Japan

export const CATEGORY_CONFIG = {
  // Default categories to fetch
  DEFAULT_CATEGORY_IDS: [3, 68, 85], // Pokemon, One Piece, Pokemon Japan
  
  // All available categories (WIP)
  ALL_CATEGORY_IDS: [1, 2, 3, 4, 17, 68, 85],
  
  // Individual category mappings (WIP)
  CATEGORIES: {
    BASEBALL: 1,
    BASKETBALL: 2,
    POKEMON: 3,
    MAGIC: 4,
    FIGHTING_GAMES: 17,
    ONE_PIECE: 68,
    POKEMON_JAPAN: 85
  },
  
  // Common combinations
  POPULAR_CATEGORIES: [3, 4, 68, 85], // Pokemon, Magic, One Piece, Pokemon Japan
  TRADING_CARDS: [3, 4, 68, 85], // Trading card games
  SPORTS_CARDS: [1, 2], // Sports cards
};
