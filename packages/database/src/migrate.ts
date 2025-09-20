import { createConnection } from './index';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('🔄 Running migrations...');
  
  const connection = createConnection(connectionString);
  const db = drizzle(connection);
  
  await migrate(db, { migrationsFolder: './drizzle' });
  
  console.log('✅ Migrations completed successfully');
  
  await connection.end();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});