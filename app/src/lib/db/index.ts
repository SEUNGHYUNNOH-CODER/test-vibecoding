import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// CRITICAL: prepare: false is required for Supabase pgBouncer transaction mode.
// Prepared statements break across pooled connections.
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
