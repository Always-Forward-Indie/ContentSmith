import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create a singleton connection
let connection: postgres.Sql | undefined;

export function createConnection(connectionString: string) {
  if (!connection) {
    connection = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return connection;
}

export function createDb(connectionString: string) {
  const client = createConnection(connectionString);
  return drizzle(client, { schema });
}

// Export types for use in other packages
export type Database = ReturnType<typeof createDb>;
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Export schema and all utilities
export * from './schema';
export { schema };

// Export query builders and operators
export { eq, desc, like, or, inArray } from 'drizzle-orm';