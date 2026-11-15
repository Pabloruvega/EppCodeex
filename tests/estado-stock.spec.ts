import { describe, expect, it } from 'vitest';
import { barraStock, estadoStock, ordenarPorUrgencia } from '#lib/estado-stock.js';

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

describe('barraStock', () => {
	it('con stock bajo, la escala es el doble del mínimo', () => {
		expect(barraStock(5, 10)).toEqual({ relleno: 0.25, marca: 0.5 });
	});

	it('con stock alto, la escala es el stock', () => {
		expect(barraStock(40, 10)).toEqual({ relleno: 1, marca: 0.25 });
	});

	it('sin mínimo no hay marca, y sin nada no divide por cero', () => {
		expect(barraStock(0, 0)).toEqual({ relleno: 0, marca: null });
	});
});
