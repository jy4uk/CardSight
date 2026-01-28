import { query } from './services/db.js';

async function addCardShow(showName, location, showDate) {
  try {
    const result = await query(`
      INSERT INTO card_shows (show_name, location, show_date)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [showName, location, showDate]);
    
    console.log('✅ Card show added successfully:');
    console.log(`   Name: ${result.rows[0].show_name}`);
    console.log(`   Location: ${result.rows[0].location}`);
    console.log(`   Date: ${result.rows[0].show_date}`);
    console.log(`   ID: ${result.rows[0].id}`);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error adding card show:', error);
    throw error;
  }
}

// Example usage - uncomment and modify as needed
async function main() {
  // Add a new card show
  await addCardShow(
    'Pokemon Regional Championship', 
    'Los Angeles Convention Center', 
    '2025-02-15'
  );
  
  // Add another example
  await addCardShow(
    'Magic: The Gathering Grand Prix',
    'Seattle Center',
    '2025-03-20'
  );
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { addCardShow };
