export * from './enums';
export * from './tables';

// Re-export commonly used drizzle-orm functions
export { eq, and, or, not, isNull, isNotNull, like, ilike, desc, asc, sql } from 'drizzle-orm';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Export the main schema tables for type inference
import * as schema from './tables';
export { schema };