import { and, eq, gte, ne, sql } from 'drizzle-orm';
import { hoyISO } from '#lib/fechas.js';
import type { Db } from './db/index.js';
import { articulos, movimientos, type Articulo, type Movimiento } from './db/schema.js';
import { ErrorUsuario } from './errores.js';

// Toda operación que toca stock + movimiento corre en una transacción.
// Las restas usan `WHERE stock >= n` para que dos cargas simultáneas no dejen stock negativo.

/** Falla si otro artículo (distinto de `excepto`) ya usa ese nombre, sin importar mayúsculas. */
async function verificarNombreLibre(db: Db, nombre: string, excepto?: number) {
	const [existente] = await db
		.select({ id: articulos.id })
		.from(articulos)
		.where(and(sql`lower(${articulos.nombre}) = lower(${nombre})`, excepto ? ne(articulos.id, excepto) : undefined));
	if (existente) throw new ErrorUsuario(`Ya existe un artículo llamado "${nombre}".`);
}

/** Si ya hay una categoría igual escrita con otras mayúsculas ("guantes" vs "Guantes"), usa esa: así no se duplican. */
async function categoriaExistente(db: Db, categoria: string | null) {
	if (!categoria) return null;
	const [existente] = await db
		.selectDistinct({ categoria: articulos.categoria })
		.from(articulos)
		.where(sql`lower(${articulos.categoria}) = lower(${categoria})`)
		.limit(1);
	return existente?.categoria ?? categoria;
}

type DatosArticulo = { nombre: string; categoria: string | null; stock: number; stockMinimo: number };

export async function crearArticulo(db: Db, datos: DatosArticulo) {
	await verificarNombreLibre(db, datos.nombre);
	const [creado] = await db
		.insert(articulos)
		.values({ ...datos, categoria: await categoriaExistente(db, datos.categoria) })
		.returning();
	return creado;
}

/** Cambia nombre, categoría, stock y mínimo. Los movimientos apuntan al id, así que el historial pasa a mostrar el nombre nuevo. */
export async function editarArticulo(db: Db, datos: DatosArticulo & { id: number }) {
	await verificarNombreLibre(db, datos.nombre, datos.id);
	const [editado] = await db
		.update(articulos)
		.set({
			nombre: datos.nombre,
			categoria: await categoriaExistente(db, datos.categoria),
			stock: datos.stock,
			stockMinimo: datos.stockMinimo
		})
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

/**
 * Entrega uno o más artículos a un empleado: un movimiento por artículo.
 * Si falta stock de alguno, no se registra ninguno.
 */
export async function registrarEntrega(
	db: Db,
	datos: {
		items: { articuloId: number; cantidad: number }[];
		fecha: string;
		empleado: string;
		observaciones: string | null;
	}
) {
	const { items, ...comunes } = datos;
	// Siempre en el mismo orden, para que dos entregas simultáneas no se bloqueen entre sí.
	const ordenados = [...items].sort((a, b) => a.articuloId - b.articuloId);

	return db.transaction(async (tx) => {
		const entregados: { articulo: Articulo; movimiento: Movimiento }[] = [];
		for (const item of ordenados) {
			const [articulo] = await tx
				.update(articulos)
				.set({ stock: sql`${articulos.stock} - ${item.cantidad}` })
				.where(and(eq(articulos.id, item.articuloId), gte(articulos.stock, item.cantidad)))
				.returning();

			// Lanzar dentro de la transacción deshace también los artículos ya descontados.
			if (!articulo) {
				const [actual] = await tx.select().from(articulos).where(eq(articulos.id, item.articuloId));
				if (!actual) throw new ErrorUsuario('El artículo no existe.');
				throw new ErrorUsuario(
					`Stock insuficiente de "${actual.nombre}": hay ${actual.stock} y se quieren entregar ${item.cantidad}. No se registró la entrega.`
				);
			}

			const [movimiento] = await tx
				.insert(movimientos)
				.values({ tipo: 'entrega', ...comunes, ...item })
				.returning();
			entregados.push({ articulo, movimiento });
		}
		return entregados;
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
