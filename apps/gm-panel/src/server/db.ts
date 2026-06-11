import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: any;

export const db = new Proxy({} as any, {
  get(_target, prop: string) {
    if (!_db) {
      const url = process.env.GAME_DATABASE_URL;
      if (!url) throw new Error('GAME_DATABASE_URL environment variable is required');
      _db = drizzle(postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 }), { schema });
    }
    const val = _db[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  },
});

export type DB = typeof _db;
