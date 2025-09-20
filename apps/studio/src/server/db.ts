import { createDb } from '@contentsmith/database';

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const db = createDb(connectionString);