import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';

/** Postgres en memoria con las mismas migraciones que producción. */
export async function crearDbTest() {
	const pglite = drizzle({ client: new PGlite(), schema });
	await migrate(pglite, { migrationsFolder: 'drizzle' });
	const db = pglite as unknown as Db;

	return {
		db,
		vaciar: () => db.execute(sql`TRUNCATE articulos, movimientos, login_intentos RESTART IDENTITY CASCADE`)
	};
}
