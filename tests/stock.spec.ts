import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { listarMovimientos } from '#lib/server/consultas.js';
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

const nuevo = { nombre: '', categoria: null, stock: 5, stockMinimo: 0 };

const entrega = (articuloId: number, cantidad: number) => ({
	items: [{ articuloId, cantidad }],
	fecha: '2026-11-12',
	empleado: 'Juan Pérez',
	observaciones: null
});

describe('lógica de stock', () => {
	let guantes: number;

	beforeAll(async () => {
		await vaciar();
	});

	beforeEach(async () => {
		await vaciar();
		guantes = (await crearArticulo(db, { nombre: 'Guantes', categoria: null, stock: 10, stockMinimo: 2 })).id;
	});

	it('no permite dos artículos con el mismo nombre (sin importar mayúsculas)', async () => {
		await expect(crearArticulo(db, { nombre: 'guantes', categoria: null, stock: 0, stockMinimo: 0 })).rejects.toThrow(ErrorUsuario);
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
		const [{ articulo, movimiento }] = await registrarEntrega(db, entrega(guantes, 3));
		expect(articulo.stock).toBe(7);
		expect(movimiento).toMatchObject({ tipo: 'entrega', cantidad: 3, empleado: 'Juan Pérez' });
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

	it('una entrega con varios artículos descuenta cada uno y registra un movimiento por artículo', async () => {
		const casco = (await crearArticulo(db, { nombre: 'Casco', categoria: null, stock: 5, stockMinimo: 0 })).id;
		const entregados = await registrarEntrega(db, {
			...entrega(guantes, 3),
			items: [
				{ articuloId: casco, cantidad: 1 },
				{ articuloId: guantes, cantidad: 3 }
			]
		});
		expect(entregados.map((e) => [e.articulo.nombre, e.articulo.stock])).toEqual([
			['Guantes', 7],
			['Casco', 4]
		]);
		const registrados = await db.select().from(movimientos);
		expect(registrados).toHaveLength(2);
		expect(registrados.every((m) => m.tipo === 'entrega' && m.empleado === 'Juan Pérez')).toBe(true);
	});

	it('si falta stock de un artículo no se entrega ninguno', async () => {
		const casco = (await crearArticulo(db, { nombre: 'Casco', categoria: null, stock: 1, stockMinimo: 0 })).id;
		const items = [
			{ articuloId: guantes, cantidad: 2 },
			{ articuloId: casco, cantidad: 2 }
		];
		await expect(registrarEntrega(db, { ...entrega(guantes, 2), items })).rejects.toThrow(/Stock insuficiente de "Casco"/);
		expect(await stockDe(guantes)).toBe(10);
		expect(await stockDe(casco)).toBe(1);
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});

	it('entregar un artículo inexistente falla', async () => {
		await expect(registrarEntrega(db, entrega(9999, 1))).rejects.toThrow('El artículo no existe.');
	});

	it('borrar una entrega devuelve el stock', async () => {
		const [{ movimiento }] = await registrarEntrega(db, entrega(guantes, 4));
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
		const editado = await editarArticulo(db, { id: guantes, nombre: 'Guantes', categoria: null, stock: 50, stockMinimo: 8 });
		expect(editado).toMatchObject({ stock: 50, stockMinimo: 8 });
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});

	it('editar renombra el artículo y su historial muestra el nombre nuevo', async () => {
		await registrarEntrega(db, entrega(guantes, 1));
		const editado = await editarArticulo(db, { id: guantes, nombre: 'Guantes de nitrilo', categoria: null, stock: 9, stockMinimo: 2 });
		expect(editado.nombre).toBe('Guantes de nitrilo');
		expect(await listarMovimientos(db)).toMatchObject([{ articulo: 'Guantes de nitrilo' }]);
	});

	it('no se puede renombrar con el nombre de otro artículo, pero sí cambiarle mayúsculas al propio', async () => {
		await crearArticulo(db, { ...nuevo, nombre: 'Casco' });
		await expect(editarArticulo(db, { id: guantes, nombre: 'casco', categoria: null, stock: 10, stockMinimo: 2 })).rejects.toThrow(
			/Ya existe un artículo llamado "casco"/
		);
		const editado = await editarArticulo(db, { id: guantes, nombre: 'GUANTES', categoria: null, stock: 10, stockMinimo: 2 });
		expect(editado.nombre).toBe('GUANTES');
	});

	it('una categoría escrita con otras mayúsculas usa la que ya existe', async () => {
		await crearArticulo(db, { ...nuevo, nombre: 'Casco', categoria: 'Protección craneana' });
		const anteojos = await crearArticulo(db, { ...nuevo, nombre: 'Anteojos', categoria: 'protección CRANEANA' });
		expect(anteojos.categoria).toBe('Protección craneana');
		const editado = await editarArticulo(db, { id: guantes, nombre: 'Guantes', categoria: 'PROTECCIÓN craneana', stock: 10, stockMinimo: 2 });
		expect(editado.categoria).toBe('Protección craneana');
	});

	it('borrar un artículo borra sus movimientos', async () => {
		await registrarEntrega(db, entrega(guantes, 1));
		await borrarArticulo(db, guantes);
		expect(await db.select().from(articulos)).toHaveLength(0);
		expect(await db.select().from(movimientos)).toHaveLength(0);
	});
});
