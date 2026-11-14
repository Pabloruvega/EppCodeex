import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { articulos, movimientos } from '#lib/server/db/schema.js';
import { ErrorUsuario } from '#lib/server/errores.js';
import {
	borrarArticulo,
	borrarMovimiento,
	crearArticulo,
	editarArticulo,
	registrarEntrega,
	registrarIngreso
} from '#lib/server/stock.js';
import { crearDbTest } from './db-test.js';

const { db, vaciar } = await crearDbTest();

async function stockDe(id: number) {
	const [a] = await db.select().from(articulos).where(eq(articulos.id, id));
	return a?.stock;
}

const entrega = (articuloId: number, cantidad: number) => ({
	articuloId,
	cantidad,
	fecha: '2026-11-12',
	empleado: '123 - Juan Pérez',
	observaciones: null
});

describe('lógica de stock', () => {
	let guantes: number;

	beforeAll(async () => {
		await vaciar();
	});

	beforeEach(async () => {
		await vaciar();
		guantes = (await crearArticulo(db, { nombre: 'Guantes', stock: 10, stockMinimo: 2 })).id;
	});

	it('no permite dos artículos con el mismo nombre (sin importar mayúsculas)', async () => {
		await expect(crearArticulo(db, { nombre: 'guantes', stock: 0, stockMinimo: 0 })).rejects.toThrow(ErrorUsuario);
	});

	it('un ingreso suma al stock y registra el movimiento con fecha', async () => {
		const { articulo, movimiento } = await registrarIngreso(db, { articuloId: guantes, cantidad: 5, fecha: '2026-11-01' });
		expect(articulo.stock).toBe(15);
		expect(movimiento).toMatchObject({ tipo: 'ingreso', cantidad: 5, fecha: '2026-11-01', empleado: null });
	});

	it('un ingreso sin fecha usa la de hoy', async () => {
		const { movimiento } = await registrarIngreso(db, { articuloId: guantes, cantidad: 1 });
		expect(movimiento.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('una entrega descuenta del stock y registra al empleado', async () => {
		const { articulo, movimiento } = await registrarEntrega(db, entrega(guantes, 3));
		expect(articulo.stock).toBe(7);
		expect(movimiento).toMatchObject({ tipo: 'entrega', cantidad: 3, empleado: '123 - Juan Pérez' });
	});

	it('se puede entregar exactamente todo el stock', async () => {
		await registrarEntrega(db, entrega(guantes, 10));
		expect(await stockDe(guantes)).toBe(0);
	});

	it('una entrega mayor al stock no se registra y avisa con un mensaje claro', async () => {
		await expect(registrarEntrega(db, entrega(guantes, 11))).rejects.toThrow(/Stock insuficiente de "Guantes": hay 10/);
		expect(await stockDe(guantes)).toBe(10);
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});

	it('entregas simultáneas nunca dejan el stock negativo', async () => {
		const resultados = await Promise.allSettled([registrarEntrega(db, entrega(guantes, 6)), registrarEntrega(db, entrega(guantes, 6))]);
		expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		expect(await stockDe(guantes)).toBe(4);
	});

	it('entregar un artículo inexistente falla', async () => {
		await expect(registrarEntrega(db, entrega(9999, 1))).rejects.toThrow('El artículo no existe.');
	});

	it('borrar una entrega devuelve el stock', async () => {
		const { movimiento } = await registrarEntrega(db, entrega(guantes, 4));
		await borrarMovimiento(db, movimiento.id);
		expect(await stockDe(guantes)).toBe(10);
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});

	it('borrar un ingreso resta el stock', async () => {
		const { movimiento } = await registrarIngreso(db, { articuloId: guantes, cantidad: 5 });
		await borrarMovimiento(db, movimiento.id);
		expect(await stockDe(guantes)).toBe(10);
	});

	it('no se puede borrar un ingreso si el stock quedaría negativo, y no se borra nada', async () => {
		const { movimiento } = await registrarIngreso(db, { articuloId: guantes, cantidad: 5 });
		await registrarEntrega(db, entrega(guantes, 12)); // stock: 3
		await expect(borrarMovimiento(db, movimiento.id)).rejects.toThrow(/quedaría negativo/);
		expect(await stockDe(guantes)).toBe(3);
		expect(await db.select().from(movimientos)).toHaveLength(2);
	});

	it('borrar un movimiento inexistente falla', async () => {
		await expect(borrarMovimiento(db, 9999)).rejects.toThrow(ErrorUsuario);
	});

	it('editar cambia stock y mínimo sin crear movimientos', async () => {
		const editado = await editarArticulo(db, { id: guantes, stock: 50, stockMinimo: 8 });
		expect(editado).toMatchObject({ stock: 50, stockMinimo: 8 });
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});

	it('borrar un artículo borra sus movimientos', async () => {
		await registrarEntrega(db, entrega(guantes, 1));
		await borrarArticulo(db, guantes);
		expect(await db.select().from(articulos)).toHaveLength(0);
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});
});
