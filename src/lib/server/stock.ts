import { and, eq, gte, sql } from 'drizzle-orm';
import { hoyISO } from '#lib/fechas.js';
import type { Db } from './db/index.js';
import { articulos, movimientos } from './db/schema.js';
import { ErrorUsuario } from './errores.js';

// Toda operación que toca stock + movimiento corre en una transacción.
// Las restas usan `WHERE stock >= n` para que dos cargas simultáneas no dejen stock negativo.

export async function crearArticulo(db: Db, datos: { nombre: string; stock: number; stockMinimo: number }) {
	const [existente] = await db
		.select({ id: articulos.id })
		.from(articulos)
		.where(sql`lower(${articulos.nombre}) = lower(${datos.nombre})`);
	if (existente) throw new ErrorUsuario(`Ya existe un artículo llamado "${datos.nombre}".`);

	const [creado] = await db.insert(articulos).values(datos).returning();
	return creado;
}

export async function editarArticulo(db: Db, datos: { id: number; stock: number; stockMinimo: number }) {
	const [editado] = await db
		.update(articulos)
		.set({ stock: datos.stock, stockMinimo: datos.stockMinimo })
		.where(eq(articulos.id, datos.id))
		.returning();
	if (!editado) throw new ErrorUsuario('El artículo no existe.');
	return editado;
}

/** Borra el artículo y, por la FK con ON DELETE CASCADE, todos sus movimientos. */
export async function borrarArticulo(db: Db, id: number) {
	const [borrado] = await db.delete(articulos).where(eq(articulos.id, id)).returning();
	if (!borrado) throw new ErrorUsuario('El artículo no existe.');
	return borrado;
}

export async function registrarIngreso(db: Db, datos: { articuloId: number; cantidad: number; fecha?: string }) {
	return db.transaction(async (tx) => {
		const [articulo] = await tx
			.update(articulos)
			.set({ stock: sql`${articulos.stock} + ${datos.cantidad}` })
			.where(eq(articulos.id, datos.articuloId))
			.returning();
		if (!articulo) throw new ErrorUsuario('El artículo no existe.');

		const [movimiento] = await tx
			.insert(movimientos)
			.values({ tipo: 'ingreso', articuloId: articulo.id, cantidad: datos.cantidad, fecha: datos.fecha ?? hoyISO() })
			.returning();
		return { articulo, movimiento };
	});
}

export async function registrarEntrega(
	db: Db,
	datos: { articuloId: number; cantidad: number; fecha: string; empleado: string; observaciones: string | null }
) {
	return db.transaction(async (tx) => {
		const [articulo] = await tx
			.update(articulos)
			.set({ stock: sql`${articulos.stock} - ${datos.cantidad}` })
			.where(and(eq(articulos.id, datos.articuloId), gte(articulos.stock, datos.cantidad)))
			.returning();

		if (!articulo) {
			const [actual] = await tx.select().from(articulos).where(eq(articulos.id, datos.articuloId));
			if (!actual) throw new ErrorUsuario('El artículo no existe.');
			throw new ErrorUsuario(
				`Stock insuficiente de "${actual.nombre}": hay ${actual.stock} y se quieren entregar ${datos.cantidad}. No se registró la entrega.`
			);
		}

		const [movimiento] = await tx
			.insert(movimientos)
			.values({ tipo: 'entrega', ...datos })
			.returning();
		return { articulo, movimiento };
	});
}

/** Borra un movimiento y revierte su efecto en el stock. */
export async function borrarMovimiento(db: Db, id: number) {
	return db.transaction(async (tx) => {
		const [movimiento] = await tx.delete(movimientos).where(eq(movimientos.id, id)).returning();
		if (!movimiento) throw new ErrorUsuario('El movimiento no existe.');

		if (movimiento.tipo === 'entrega') {
			await tx
				.update(articulos)
				.set({ stock: sql`${articulos.stock} + ${movimiento.cantidad}` })
				.where(eq(articulos.id, movimiento.articuloId));
		} else {
			const [articulo] = await tx
				.update(articulos)
				.set({ stock: sql`${articulos.stock} - ${movimiento.cantidad}` })
				.where(and(eq(articulos.id, movimiento.articuloId), gte(articulos.stock, movimiento.cantidad)))
				.returning();
			// Lanzar dentro de la transacción deshace también el DELETE.
			if (!articulo) {
				throw new ErrorUsuario(
					'No se puede borrar este ingreso: parte de ese stock ya se entregó y el stock quedaría negativo.'
				);
			}
		}
		return movimiento;
	});
}
