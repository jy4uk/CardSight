import { query } from './services/db.js';

async function seedCardShows() {
  try {
    console.log('Seeding card shows...');
    
    // Sample card shows
    const cardShows = [
      {
        show_date: new Date('2026-01-25'),
        show_name: 'Pokemon Regional Championship',
        location: 'Los Angeles Convention Center'
      },
      {
        show_date: new Date('2026-01-20'),
        show_name: 'One Piece TCG Premiere',
        location: 'San Diego Convention Center'
      },
      {
        show_date: new Date('2026-01-15'),
        show_name: 'Pokemon Local Tournament',
        location: 'Community Center'
      },
      {
        show_date: new Date('2026-01-10'),
        show_name: 'TCG Collector Expo',
        location: 'Anaheim Convention Center'
      },
      {
        show_date: new Date('2026-01-05'),
        show_name: 'Pokemon Go Fest',
        location: 'San Francisco'
      }
    ];
    
    for (const show of cardShows) {
      try {
        await query(`
          INSERT INTO card_shows (show_date, show_name, location)
          VALUES ($1, $2, $3)
          ON CONFLICT (show_date) DO NOTHING
        `, [show.show_date, show.show_name, show.location]);
        
        console.log(`✓ Added show: ${show.show_name} on ${show.show_date.toLocaleDateString()}`);
      } catch (err) {
        console.error(`✗ Failed to add show ${show.show_name}:`, err.message);
      }
    }
    
    console.log('Card shows seeding complete!');
  } catch (err) {
    console.error('Error seeding card shows:', err);
  }
}

seedCardShows();
