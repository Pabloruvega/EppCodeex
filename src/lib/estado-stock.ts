/** Estado de un artículo según su stock y su mínimo. Se usa en la tabla de stock (etiqueta, orden y barra). */
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

const URGENCIA: Record<EstadoStock, number> = { 'sin-stock': 0, reponer: 1, ok: 2 };

/** Lo más urgente primero: sin stock, después a reponer, después OK. Dentro de cada grupo respeta el orden recibido. */
export function ordenarPorUrgencia<T extends { stock: number; stockMinimo: number }>(articulos: T[]): T[] {
	return articulos
		.map((a, i) => ({ a, i, u: URGENCIA[estadoStock(a.stock, a.stockMinimo)] }))
		.sort((x, y) => x.u - y.u || x.i - y.i)
		.map((x) => x.a);
}

/**
 * Proporciones (0 a 1) para la barra de stock: cuánto se llena y dónde va la marca del mínimo.
 * La escala llega al doble del mínimo, o al stock si es mayor, para que la marca no quede pegada al borde.
 */
export function barraStock(stock: number, minimo: number): { relleno: number; marca: number | null } {
	const escala = Math.max(stock, minimo * 2, 1);
	return { relleno: stock / escala, marca: minimo > 0 ? minimo / escala : null };
}
