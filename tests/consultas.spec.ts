import { beforeEach, describe, expect, it } from 'vitest';
import { agruparPorEmpleado, contarAReponer, separarEmpleado, type FilaMovimiento } from '#lib/server/consultas.js';
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

describe('separarEmpleado', () => {
	it('separa legajo y nombre', () => {
		expect(separarEmpleado('214 - Marta Quiroga')).toEqual({ legajo: '214', nombre: 'Marta Quiroga' });
	});

	it('sin el formato esperado deja todo en el nombre', () => {
		expect(separarEmpleado('Marta Quiroga')).toEqual({ legajo: '', nombre: 'Marta Quiroga' });
	});
});

describe('agruparPorEmpleado', () => {
	let id = 0;
	const fila = (empleado: string, fecha: string, articulo: string, cantidad: number): FilaMovimiento => ({
		id: ++id,
		tipo: 'entrega',
		fecha,
		articulo,
		cantidad,
		empleado,
		observaciones: null
	});

	// Como las devuelve listarEntregas: de la más nueva a la más vieja.
	const grupos = agruparPorEmpleado([
		fila('214 - Marta Quiroga', '2026-11-12', 'Guantes', 2),
		fila('087 - Oleg Baranov', '2026-11-03', 'Botines', 1),
		fila('214 - Marta Quiroga', '2026-10-20', 'Guantes', 6),
		fila('214 - Marta Quiroga', '2026-10-20', 'Casco', 1)
	]);

	it('ordena por legajo y separa legajo y nombre', () => {
		expect(grupos.map((g) => [g.legajo, g.nombre])).toEqual([
			['087', 'Oleg Baranov'],
			['214', 'Marta Quiroga']
		]);
	});

	it('toma la entrega más reciente como última', () => {
		expect(grupos.map((g) => g.ultima)).toEqual(['2026-11-03', '2026-11-12']);
	});

	it('suma los totales por artículo', () => {
		expect(grupos[1].totales).toEqual([
			{ articulo: 'Casco', cantidad: 1 },
			{ articulo: 'Guantes', cantidad: 8 }
		]);
	});
});
