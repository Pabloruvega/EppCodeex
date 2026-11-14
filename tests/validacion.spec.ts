import { describe, expect, it } from 'vitest';
import { formatearFecha, hoyISO } from '#lib/fechas.js';
import { movimientosACsv } from '#lib/server/csv.js';
import { ErrorUsuario } from '#lib/server/errores.js';
import { leerArticuloNuevo, leerEntrega, normalizarEmpleado } from '#lib/server/validacion.js';

const formulario = (campos: Record<string, string>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(campos)) f.set(k, v);
	return f;
};

describe('validación', () => {
	it('normaliza el empleado a "legajo - nombre"', () => {
		expect(normalizarEmpleado('  123 -   Juan   Pérez ')).toBe('123 - Juan Pérez');
		expect(normalizarEmpleado('123-Juan')).toBe('123 - Juan');
		expect(normalizarEmpleado('Juan Pérez')).toBeNull();
		expect(normalizarEmpleado('123 - ')).toBeNull();
	});

	it('acepta una entrega válida', () => {
		const datos = leerEntrega(
			formulario({ empleado: '7 - Ana', articuloId: '2', cantidad: '3', fecha: '2026-02-28', observaciones: '' })
		);
		expect(datos).toEqual({ empleado: '7 - Ana', articuloId: 2, cantidad: 3, fecha: '2026-02-28', observaciones: null });
	});

	it.each([
		['cantidad cero', { cantidad: '0' }],
		['cantidad negativa', { cantidad: '-1' }],
		['cantidad decimal', { cantidad: '1.5' }],
		['fecha inexistente', { fecha: '2026-02-30' }],
		['sin artículo', { articuloId: '' }],
		['empleado sin legajo', { empleado: 'Ana' }]
	])('rechaza una entrega con %s', (_, cambio) => {
		const base = { empleado: '7 - Ana', articuloId: '2', cantidad: '3', fecha: '2026-02-28' };
		expect(() => leerEntrega(formulario({ ...base, ...cambio }))).toThrow(ErrorUsuario);
	});

	it('el stock mínimo es opcional al crear un artículo', () => {
		expect(leerArticuloNuevo(formulario({ nombre: ' Casco ', stock: '4', stockMinimo: '' }))).toEqual({
			nombre: 'Casco',
			stock: 4,
			stockMinimo: 0
		});
	});
});

describe('fechas y CSV', () => {
	it('formatea dd/mm/aaaa', () => {
		expect(formatearFecha('2026-03-05')).toBe('05/03/2026');
	});

	it('hoy se calcula en hora argentina', () => {
		// 02:00 UTC del 13/11 todavía es 12/11 en Argentina (UTC-3)
		expect(hoyISO(new Date('2026-11-13T02:00:00Z'))).toBe('2026-11-12');
	});

	it('el CSV escapa separadores y evita fórmulas', () => {
		const csv = movimientosACsv([
			{ id: 1, tipo: 'entrega', fecha: '2026-11-12', articulo: 'Guantes', cantidad: 2, empleado: '1 - Ana', observaciones: '=HYPERLINK("x"); talle L' }
		]);
		expect(csv.startsWith('﻿Fecha;Tipo;Artículo;Cantidad;Empleado;Observaciones\r\n')).toBe(true);
		expect(csv).toContain('12/11/2026;Entrega;Guantes;2;1 - Ana;"\'=HYPERLINK(""x""); talle L"');
	});
});
