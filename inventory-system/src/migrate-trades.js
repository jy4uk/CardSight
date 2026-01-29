import { query } from './services/db.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('Running trades migration...');
    
    const schema = fs.readFileSync('./src/schema-trades.sql', 'utf8');
    
    // Split by semicolons and run each statement
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }
    
    console.log('✅ Trades migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
