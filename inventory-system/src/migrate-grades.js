import { query } from './services/db.js';

async function addGradeColumns() {
  try {
    console.log('Adding grade columns to inventory table...');
    
    // Add grade column
    await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grade TEXT`);
    console.log('✓ Added grade column');
    
    // Add grade_qualifier column
    await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS grade_qualifier TEXT`);
    console.log('✓ Added grade_qualifier column');
    
    // Add index for grade queries
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_grade ON inventory(grade)`);
    console.log('✓ Added grade index');
    
    console.log('✅ Grade columns migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

addGradeColumns();
