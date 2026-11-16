import { coincide } from './texto.js';

/** Estado de un artículo según su stock y su mínimo. Se usa en la tabla de stock (etiqueta, orden, totales y filtro) y en la entrega. */
export type EstadoStock = 'sin-stock' | 'reponer' | 'ok';

export const TEXTO_ESTADO: Record<EstadoStock, string> = {
	'sin-stock': 'Sin stock',
	reponer: 'Reponer',
	ok: 'OK'
};

export function estadoStock(stock: number, minimo: number): EstadoStock {
	if (stock === 0) return 'sin-stock';
	if (stock <= minimo) return 'reponer';
	return 'ok';
}

/** Filtro de la página de stock. "reponer" incluye los sin stock, igual que el contador de la barra lateral. */
export type FiltroStock = 'todos' | 'reponer' | 'sin-stock';

export function leerFiltro(valor: string | null): FiltroStock {
	return valor === 'reponer' || valor === 'sin-stock' ? valor : 'todos';
}

export function pasaFiltro(estado: EstadoStock, filtro: FiltroStock): boolean {
	if (filtro === 'reponer') return estado !== 'ok';
	if (filtro === 'sin-stock') return estado === 'sin-stock';
	return true;
}

/** Los tres totales del encabezado de la página de stock. */
export function resumenStock(articulos: { stock: number; stockMinimo: number }[]) {
	const estados = articulos.map((a) => estadoStock(a.stock, a.stockMinimo));
	return {
		articulos: articulos.length,
		aReponer: estados.filter((e) => e !== 'ok').length,
		sinStock: estados.filter((e) => e === 'sin-stock').length
	};
}

const URGENCIA: Record<EstadoStock, number> = { 'sin-stock': 0, reponer: 1, ok: 2 };

/** Lo más urgente primero: sin stock, después a reponer, después OK. Dentro de cada grupo respeta el orden recibido. */
export function ordenarPorUrgencia<T extends { stock: number; stockMinimo: number }>(articulos: T[]): T[] {
	return articulos
		.map((a, i) => ({ a, i, u: URGENCIA[estadoStock(a.stock, a.stockMinimo)] }))
		.sort((x, y) => x.u - y.u || x.i - y.i)
		.map((x) => x.a);
}

/** Lo que muestra la página de stock (y lo que se exporta): búsqueda por nombre + filtro por estado, lo urgente primero. */
export function filtrarStock<T extends { nombre: string; stock: number; stockMinimo: number }>(
	articulos: T[],
	busqueda: string,
	filtro: FiltroStock
): T[] {
	return ordenarPorUrgencia(
		articulos.filter((a) => coincide(a.nombre, busqueda) && pasaFiltro(estadoStock(a.stock, a.stockMinimo), filtro))
	);
}

/**
 * Cómo queda un artículo si se entrega `cantidad`: para el "quedan N" de cada renglón de una entrega.
 * `alcanza` es falso si se pide más de lo que hay; `bajoMinimo` usa la misma regla que la etiqueta "Reponer".
 */
export function despuesDeEntregar(stock: number, minimo: number, cantidad: number) {
	const quedan = stock - cantidad;
	return { quedan, alcanza: quedan >= 0, bajoMinimo: estadoStock(Math.max(quedan, 0), minimo) !== 'ok' };
}

