const { drizzle } = require('drizzle-orm/neon-serverless');
const { neonConfig, Pool } = require('@neondatabase/serverless');
const { migrate } = require('drizzle-orm/neon-serverless/migrator');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log('Running database migrations...');
  
  try {
    // This will automatically create tables if they don't exist
    // and add new columns or modify existing ones as needed
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('Database schema updated successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();