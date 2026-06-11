import { createDb } from '@/db';

let _db: any;

export const db = new Proxy({} as any, {
  get(_target, prop: string) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('DATABASE_URL environment variable is required');
      _db = createDb(url);
    }
    const val = _db[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  },
});
