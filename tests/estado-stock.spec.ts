import { describe, expect, it } from 'vitest';
import {
	despuesDeEntregar,
	estadoStock,
	leerFiltro,
	ordenarPorUrgencia,
	pasaFiltro,
	resumenStock
} from '#lib/estado-stock.js';
import { coincide } from '#lib/texto.js';

describe('resumenStock', () => {
	it('cuenta artículos, a reponer (con los sin stock) y sin stock', () => {
		const articulos = [
			{ stock: 40, stockMinimo: 15 },
			{ stock: 0, stockMinimo: 2 },
			{ stock: 6, stockMinimo: 20 },
			{ stock: 24, stockMinimo: 10 }
		];
		expect(resumenStock(articulos)).toEqual({ articulos: 4, aReponer: 2, sinStock: 1 });
	});
});

describe('filtro de stock', () => {
	it('lee el filtro de la URL y cae en "todos" ante cualquier otra cosa', () => {
		expect(leerFiltro('reponer')).toBe('reponer');
		expect(leerFiltro('sin-stock')).toBe('sin-stock');
		expect(leerFiltro('cualquiera')).toBe('todos');
		expect(leerFiltro(null)).toBe('todos');
	});

	it('"a reponer" incluye los sin stock; "sin stock" sólo esos', () => {
		expect(pasaFiltro('sin-stock', 'reponer')).toBe(true);
		expect(pasaFiltro('ok', 'reponer')).toBe(false);
		expect(pasaFiltro('reponer', 'sin-stock')).toBe(false);
		expect(pasaFiltro('ok', 'todos')).toBe(true);
	});
});

describe('coincide', () => {
	it('ignora mayúsculas, acentos y espacios en los extremos', () => {
		expect(coincide('Arnés de cuerpo completo', ' arnes ')).toBe(true);
		expect(coincide('Casco', 'guante')).toBe(false);
	});
});

describe('despuesDeEntregar', () => {
	it('por encima del mínimo no avisa', () => {
		expect(despuesDeEntregar(40, 15, 1)).toEqual({ quedan: 39, alcanza: true, bajoMinimo: false });
	});

	it('si queda en el mínimo o por debajo, avisa', () => {
		expect(despuesDeEntregar(20, 15, 5)).toEqual({ quedan: 15, alcanza: true, bajoMinimo: true });
	});

	it('si se lleva todo, queda sin stock', () => {
		expect(despuesDeEntregar(6, 0, 6)).toEqual({ quedan: 0, alcanza: true, bajoMinimo: true });
	});

	it('si se pide más de lo que hay, no alcanza', () => {
		expect(despuesDeEntregar(3, 1, 5)).toEqual({ quedan: -2, alcanza: false, bajoMinimo: true });
	});
});

describe('estadoStock', () => {
	it('stock en cero es sin stock, aunque el mínimo sea cero', () => {
		expect(estadoStock(0, 5)).toBe('sin-stock');
		expect(estadoStock(0, 0)).toBe('sin-stock');
	});

	it('en el mínimo o por debajo es reponer', () => {
		expect(estadoStock(5, 5)).toBe('reponer');
		expect(estadoStock(3, 5)).toBe('reponer');
	});

	it('por encima del mínimo es OK', () => {
		expect(estadoStock(6, 5)).toBe('ok');
	});
});

describe('ordenarPorUrgencia', () => {
	it('pone primero sin stock, después reponer, después OK, sin desordenar cada grupo', () => {
		const articulos = [
			{ nombre: 'Anteojos', stock: 40, stockMinimo: 15 },
			{ nombre: 'Arnés', stock: 0, stockMinimo: 2 },
			{ nombre: 'Casco', stock: 24, stockMinimo: 10 },
			{ nombre: 'Guantes', stock: 6, stockMinimo: 20 },
			{ nombre: 'Protector', stock: 3, stockMinimo: 3 }
		];
		expect(ordenarPorUrgencia(articulos).map((a) => a.nombre)).toEqual(['Arnés', 'Guantes', 'Protector', 'Anteojos', 'Casco']);
	});

	it('no modifica la lista original', () => {
		const articulos = [
			{ stock: 10, stockMinimo: 1 },
			{ stock: 0, stockMinimo: 1 }
		];
		ordenarPorUrgencia(articulos);
		expect(articulos[0].stock).toBe(10);
	});
});

