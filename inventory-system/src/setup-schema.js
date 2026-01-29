import { query } from './services/db.js';
import fs from 'fs';

async function setupSchema() {
  try {
    console.log('Setting up database schema...');
    
    // Read and execute schema.sql
    const schema = fs.readFileSync('./src/schema.sql', 'utf8');
    await query(schema);
    
    console.log('✅ Database schema created successfully!');
  } catch (err) {
    console.error('❌ Schema setup failed:', err);
    process.exit(1);
  }
}

setupSchema();
