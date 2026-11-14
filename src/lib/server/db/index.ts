import { Pool } from '@neondatabase/serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.js';

/** Cualquier base Postgres de Drizzle con este esquema (Neon en producción, PGlite en tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Neon recomienda crear y cerrar el Pool dentro de cada request en Vercel Functions.
 * El Pool no abre conexión hasta la primera consulta, así que crearlo es barato.
 */
export function crearDb(databaseUrl: string) {
	const pool = new Pool({ connectionString: databaseUrl });
	const db: Db = drizzle({ client: pool, schema });
	return { db, cerrar: () => pool.end() };
}
