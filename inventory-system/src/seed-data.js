import { query } from './services/db.js';
import { addInventoryItem } from './services/inventoryService.js';

// Sample Pokemon cards with realistic data
const sampleCards = [
  // Common cards
  { barcode_id: 'PKM001', card_name: 'Pikachu', set_name: 'Base Set', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 2.50, front_label_price: 4.99, notes: 'Classic Pikachu', purchase_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM002', card_name: 'Charizard', set_name: 'Base Set', game: 'pokemon', card_type: 'raw', condition: 'LP', purchase_price: 45.00, front_label_price: 89.99, notes: 'Slight edge wear', purchase_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM003', card_name: 'Blastoise', set_name: 'Base Set', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 3.50, front_label_price: 6.99, notes: 'Water starter', purchase_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM004', card_name: 'Venusaur', set_name: 'Base Set', game: 'pokemon', card_type: 'raw', condition: 'MP', purchase_price: 4.00, front_label_price: 7.99, notes: 'Some scratches', purchase_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM005', card_name: 'Mewtwo', set_name: 'Base Set', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 85.00, front_label_price: 149.99, notes: 'Mint condition', purchase_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  
  // Modern cards
  { barcode_id: 'PKM006', card_name: 'Charizard VMAX', set_name: 'Darkness Ablaze', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 65.00, front_label_price: 125.00, notes: 'Rainbow holo', purchase_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM007', card_name: 'Lucario V', set_name: 'Brilliant Stars', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 8.50, front_label_price: 15.99, notes: 'Full art', purchase_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM008', card_name: 'Gardevoir VMAX', set_name: 'Brilliant Stars', game: 'pokemon', card_type: 'raw', condition: 'LP', purchase_price: 45.00, front_label_price: 89.99, notes: 'Minor corner wear', purchase_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM009', card_name: 'Rayquaza VMAX', set_name: 'Evolving Skies', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 120.00, front_label_price: 250.00, notes: 'Rainbow rare', purchase_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM010', card_name: 'Eevee', set_name: 'Celebrations', game: 'pokemon', card_type: 'raw', condition: 'NM', purchase_price: 5.00, front_label_price: 9.99, notes: 'Promo card', purchase_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  
  // One Piece cards
  { barcode_id: 'OP001', card_name: 'Monkey D. Luffy', set_name: 'Romance Dawn', game: 'onepiece', card_type: 'raw', condition: 'NM', purchase_price: 3.00, front_label_price: 6.99, notes: 'Starter card', purchase_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'OP002', card_name: 'Roronoa Zoro', set_name: 'Romance Dawn', game: 'onepiece', card_type: 'raw', condition: 'NM', purchase_price: 3.50, front_label_price: 7.99, notes: 'Swordsman', purchase_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'OP003', card_name: 'Nami', set_name: 'Romance Dawn', game: 'onepiece', card_type: 'raw', condition: 'LP', purchase_price: 2.50, front_label_price: 5.99, notes: 'Navigator', purchase_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'OP004', card_name: 'Sanji', set_name: 'Romance Dawn', game: 'onepiece', card_type: 'raw', condition: 'NM', purchase_price: 3.00, front_label_price: 6.99, notes: 'Chef', purchase_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  
  // Graded cards
  { barcode_id: 'PKM011', card_name: 'Charizard', set_name: 'Base Set', game: 'pokemon', card_type: 'psa', cert_number: '12345678', condition: 'NM', purchase_price: 500.00, front_label_price: 1200.00, notes: 'PSA 10 Gem Mint', purchase_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM012', card_name: 'Blastoise', set_name: 'Base Set', game: 'pokemon', card_type: 'bgs', cert_number: '87654321', condition: 'NM', purchase_price: 350.00, front_label_price: 800.00, notes: 'BGS 9.5', purchase_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { barcode_id: 'PKM013', card_name: 'Venusaur', set_name: 'Base Set', game: 'pokemon', card_type: 'cgc', cert_number: '98765432', condition: 'NM', purchase_price: 200.00, front_label_price: 450.00, notes: 'CGC 9.5', purchase_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
];

async function seedInventory() {
  console.log('Seeding inventory data...');
  
  try {
    for (const card of sampleCards) {
      try {
        await addInventoryItem(card);
        console.log(`✓ Added: ${card.card_name} (${card.barcode_id})`);
      } catch (err) {
        console.error(`✗ Failed to add ${card.card_name}:`, err.message);
      }
    }
    console.log('Inventory seeding complete!');
  } catch (err) {
    console.error('Error seeding inventory:', err);
  }
}

async function seedTransactions() {
  console.log('Seeding transaction data...');
  
  try {
    // Get some inventory items to create sales for
    const inventory = await query('SELECT id, barcode_id, card_name, purchase_price, purchase_date FROM inventory WHERE status = \'IN_STOCK\' LIMIT 10');
    
    for (const item of inventory) {
      // Create a sale with random markup
      const markup = 1.5 + Math.random() * 2; // 150% to 350% markup
      const salePrice = Number(item.purchase_price) * markup;
      const profit = salePrice - Number(item.purchase_price);
      
      // Calculate sale date to be after purchase date
      const purchaseDate = new Date(item.purchase_date);
      const now = new Date();
      
      // Create realistic time-in-inventory distribution
      // 40% sell within 0-7 days, 40% within 8-30 days, 20% within 31-90 days
      const rand = Math.random();
      let maxDaysInInventory;
      if (rand < 0.4) maxDaysInInventory = 7;
      else if (rand < 0.8) maxDaysInInventory = 30;
      else maxDaysInInventory = 90;
      
      const daysInInventory = Math.floor(Math.random() * maxDaysInInventory);
      const finalSaleDate = new Date(purchaseDate.getTime() + (daysInInventory * 24 * 60 * 60 * 1000));
      
      // Ensure sale date is not in the future
      const adjustedSaleDate = finalSaleDate > now ? new Date(now.getTime() - (1000 * 60 * 60 * 24)) : finalSaleDate;
      
      console.log(`  ${item.card_name}: Purchased ${purchaseDate.toLocaleDateString()}, Sold ${adjustedSaleDate.toLocaleDateString()}, Days in inventory: ${Math.max(0, Math.round((adjustedSaleDate - purchaseDate) / (1000 * 60 * 60 * 24)))}`);
      
      // Randomly assign to a card show (60% chance) or direct sale (40% chance)
      let showId = null;
      if (Math.random() > 0.4) {
        // Get a random card show
        const shows = await query('SELECT id FROM card_shows ORDER BY show_date DESC LIMIT 5');
        if (shows.length > 0) {
          const randomShow = shows[Math.floor(Math.random() * shows.length)];
          showId = randomShow.id;
        }
      }
      
      await query(`
        INSERT INTO transactions (inventory_id, stripe_payment_intent_id, sale_price, fees, net_amount, sale_date, payment_method, show_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        item.id,
        `pi_test_${item.barcode_id}`,
        salePrice,
        0, // No fees for test data
        profit,
        adjustedSaleDate,
        Math.random() > 0.7 ? 'TERMINAL' : 'CARD',
        showId
      ]);
      
      // Mark item as sold
      await query('UPDATE inventory SET status = \'SOLD\' WHERE id = $1', [item.id]);
      
      console.log(`✓ Sold: ${item.card_name} for $${salePrice.toFixed(2)} (profit: $${profit.toFixed(2)})`);
    }
    
    console.log('Transaction seeding complete!');
  } catch (err) {
    console.error('Error seeding transactions:', err);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');
  
  // Clear existing data
  console.log('Clearing existing data...');
  await query('DELETE FROM transactions');
  await query('DELETE FROM inventory');
  console.log('✓ Cleared existing data');
  
  // Seed new data
  await seedInventory();
  await seedTransactions();
  
  console.log('🎉 Database seeding complete!');
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedInventory, seedTransactions };
