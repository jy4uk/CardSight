# TCGCSV Multi-Category Fetch Script

This script now supports fetching data from multiple TCGCSV categories in a single run with multithreaded database processing.

## Configuration

Edit `category-config.ts` to customize which categories to fetch:

```typescript
// Available categories:
// 3: Pokemon
// 68: One Piece

// Change this line to fetch different categories:
const CATEGORY_IDS = CATEGORY_CONFIG.DEFAULT_CATEGORY_IDS; // [3, 68] - Pokemon and One Piece
```

## Predefined Category Combinations

```typescript
// Popular trading card games
CATEGORY_CONFIG.POPULAR_CATEGORIES // [3, 68] - Pokemon, One Piece

// All trading card games
CATEGORY_CONFIG.TRADING_CARDS // [3, 68]

// Sports cards only
CATEGORY_CONFIG.SPORTS_CARDS // [1, 2]

// All available categories
CATEGORY_CONFIG.ALL_CATEGORY_IDS // [1, 2, 3, 4, 17, 68]
```

## Usage Examples

### Fetch Pokemon and One Piece (Default)
```bash
npm run fetch:tcg
```

### Fetch All Trading Card Games
Edit `fetch-tcg-data.ts`:
```typescript
const CATEGORY_IDS = CATEGORY_CONFIG.TRADING_CARDS;
```

### Fetch Specific Categories
Edit `fetch-tcg-data.ts`:
```typescript
const CATEGORY_IDS = [3, 68]; // Pokemon, One Piece
```

## Performance Features

- **Multithreaded Processing**: 4 parallel workers for database operations
- **Change Detection**: Only updates changed records
- **Incremental Updates**: Safe to run repeatedly
- **Error Handling**: Continues processing if individual groups fail

## Expected Output

```
Starting data fetch process...
Fetching data for categories: 3, 68

Fetching groups for category 3...
Found 150 groups for category 3
Fetching groups for category 68...
Found 64 groups for category 68
Total groups found across all categories: 214

Processing 214 groups with 4 parallel workers...
Groups processing complete: 5 new, 2 updated, 207 unchanged, 0 errors

Processing 2500 products with 4 parallel workers...
Products processing complete: 120 new, 45 updated, 2335 unchanged, 0 errors

Processing 7500 prices with 4 parallel workers...
Prices processing complete: 7500 processed, 0 errors

=== Database Update Complete ===
Total groups in database: 214
Total products in database: 2500
Total price entries in database: 7500
Total execution time: 45.32 seconds
```
