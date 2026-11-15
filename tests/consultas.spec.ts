import { beforeEach, describe, expect, it } from 'vitest';
import { contarAReponer } from '#lib/server/consultas.js';
import { articulos } from '#lib/server/db/schema.js';
import { crearDbTest } from './db-test.js';

const { db, vaciar } = await crearDbTest();

describe('contarAReponer', () => {
	beforeEach(async () => {
		await vaciar();
	});

	it('da 0 sin artículos', async () => {
		expect(await contarAReponer(db)).toBe(0);
	});

	it('cuenta los que están en el mínimo o por debajo, incluido el stock en cero', async () => {
		await db.insert(articulos).values([
			{ nombre: 'Casco', stock: 24, stockMinimo: 10 },
			{ nombre: 'Guantes', stock: 6, stockMinimo: 20 },
			{ nombre: 'Arnés', stock: 0, stockMinimo: 2 },
			{ nombre: 'Anteojos', stock: 15, stockMinimo: 15 }
		]);
		expect(await contarAReponer(db)).toBe(3);
	});
});
