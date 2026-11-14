import { and, count, eq, gt, lte, sql } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { loginIntentos } from './db/schema.js';

// Se guarda en la base porque en Vercel cada instancia tiene su propia memoria.
export const MAX_INTENTOS = 5;
const VENTANA = sql`now() - interval '15 minutes'`;

export async function loginBloqueado(db: Db, ip: string): Promise<boolean> {
	const [{ total }] = await db
		.select({ total: count() })
		.from(loginIntentos)
		.where(and(eq(loginIntentos.ip, ip), gt(loginIntentos.creadoEn, VENTANA)));
	return total >= MAX_INTENTOS;
}

export async function registrarFallo(db: Db, ip: string): Promise<void> {
	await db.insert(loginIntentos).values({ ip });
	await db.delete(loginIntentos).where(lte(loginIntentos.creadoEn, VENTANA));
}

export async function limpiarIntentos(db: Db, ip: string): Promise<void> {
	await db.delete(loginIntentos).where(eq(loginIntentos.ip, ip));
}
