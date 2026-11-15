import { asc, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';
import { separarEmpleado } from '../empleado.js';
import type { Db } from './db/index.js';
import { articulos, movimientos } from './db/schema.js';

export function listarArticulos(db: Db) {
	return db
		.select({
			id: articulos.id,
			nombre: articulos.nombre,
			stock: articulos.stock,
			stockMinimo: articulos.stockMinimo,
			movimientos: sql<number>`count(${movimientos.id})::int`
		})
		.from(articulos)
		.leftJoin(movimientos, eq(movimientos.articuloId, articulos.id))
		.groupBy(articulos.id)
		.orderBy(asc(articulos.nombre));
}

/** Cuántos artículos están en el mínimo o por debajo: el contador de la barra lateral. */
export async function contarAReponer(db: Db) {
	const [fila] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(articulos)
		.where(lte(articulos.stock, articulos.stockMinimo));
	return fila?.total ?? 0;
}

const columnasMovimiento = {
	id: movimientos.id,
	tipo: movimientos.tipo,
	fecha: movimientos.fecha,
	articulo: articulos.nombre,
	cantidad: movimientos.cantidad,
	empleado: movimientos.empleado,
	observaciones: movimientos.observaciones
};

/** Solo entregas: es lo único de movimientos que ve el público. */
export function listarEntregas(db: Db) {
	return db
		.select(columnasMovimiento)
		.from(movimientos)
		.innerJoin(articulos, eq(articulos.id, movimientos.articuloId))
		.where(eq(movimientos.tipo, 'entrega'))
		.orderBy(desc(movimientos.fecha), desc(movimientos.id));
}

/** Ingresos y entregas. Solo para admin. */
export function listarMovimientos(db: Db) {
	return db
		.select(columnasMovimiento)
		.from(movimientos)
		.innerJoin(articulos, eq(articulos.id, movimientos.articuloId))
		.orderBy(desc(movimientos.fecha), desc(movimientos.id));
}

export async function listarEmpleados(db: Db) {
	const filas = await db
		.selectDistinct({ empleado: movimientos.empleado })
		.from(movimientos)
		.where(isNotNull(movimientos.empleado))
		.orderBy(asc(movimientos.empleado));
	return filas.map((f) => f.empleado as string);
}

export type FilaMovimiento = Awaited<ReturnType<typeof listarMovimientos>>[number];

export type EntregasEmpleado = {
	/** Tal como se guardó: "legajo - nombre". Es la clave del grupo y lo que usa la búsqueda. */
	empleado: string;
	legajo: string;
	nombre: string;
	/** Fecha ISO de la entrega más reciente. */
	ultima: string;
	totales: { articulo: string; cantidad: number }[];
	detalle: FilaMovimiento[];
};

/** Agrupa entregas (ya ordenadas por fecha desc) por empleado, con totales por artículo. */
export function agruparPorEmpleado(entregas: FilaMovimiento[]): EntregasEmpleado[] {
	const grupos = new Map<string, EntregasEmpleado>();
	for (const e of entregas) {
		const clave = e.empleado ?? '';
		let grupo = grupos.get(clave);
		if (!grupo) {
			// Como vienen de la más nueva a la más vieja, la primera de cada empleado es la última entrega.
			grupo = { empleado: clave, ...separarEmpleado(clave), ultima: e.fecha, totales: [], detalle: [] };
			grupos.set(clave, grupo);
		}
		grupo.detalle.push(e);
		const total = grupo.totales.find((t) => t.articulo === e.articulo);
		if (total) total.cantidad += e.cantidad;
		else grupo.totales.push({ articulo: e.articulo, cantidad: e.cantidad });
	}
	return [...grupos.values()]
		.map((g) => ({ ...g, totales: g.totales.sort((a, b) => a.articulo.localeCompare(b.articulo, 'es')) }))
		.sort((a, b) => a.empleado.localeCompare(b.empleado, 'es', { numeric: true }));
}
