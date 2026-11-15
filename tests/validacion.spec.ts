import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { formatearFecha, hoyISO } from '#lib/fechas.js';
import { movimientosACsv } from '#lib/server/csv.js';
import { ErrorUsuario } from '#lib/server/errores.js';
import { movimientosAXlsx } from '#lib/server/excel.js';
import { movimientosAPdf } from '#lib/server/pdf.js';
import { leerArticuloNuevo, leerEntrega } from '#lib/server/validacion.js';

const formulario = (campos: Record<string, string>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(campos)) f.set(k, v);
	return f;
};

describe('validación', () => {
	it('el empleado es solo el nombre, sin espacios de más', () => {
		const f = formulario({ empleado: '  Juan   Pérez ', articuloId: '2', cantidad: '3', fecha: '2026-02-28' });
		expect(leerEntrega(f).empleado).toBe('Juan Pérez');
	});

	it('acepta una entrega válida', () => {
		const datos = leerEntrega(
			formulario({ empleado: 'Ana', articuloId: '2', cantidad: '3', fecha: '2026-02-28', observaciones: '' })
		);
		expect(datos).toEqual({ empleado: 'Ana', items: [{ articuloId: 2, cantidad: 3 }], fecha: '2026-02-28', observaciones: null });
	});

	it('acepta varios artículos, ignora renglones vacíos y suma los repetidos', () => {
		const f = formulario({ empleado: 'Ana', fecha: '2026-02-28' });
		for (const [id, cantidad] of [['2', '3'], ['', '1'], ['5', '1'], ['2', '4']]) {
			f.append('articuloId', id);
			f.append('cantidad', cantidad);
		}
		expect(leerEntrega(f).items).toEqual([
			{ articuloId: 2, cantidad: 7 },
			{ articuloId: 5, cantidad: 1 }
		]);
	});

	it.each([
		['cantidad cero', { cantidad: '0' }],
		['cantidad negativa', { cantidad: '-1' }],
		['cantidad decimal', { cantidad: '1.5' }],
		['fecha inexistente', { fecha: '2026-02-30' }],
		['sin artículo', { articuloId: '' }],
		['empleado vacío', { empleado: '   ' }]
	])('rechaza una entrega con %s', (_, cambio) => {
		const base = { empleado: 'Ana', articuloId: '2', cantidad: '3', fecha: '2026-02-28' };
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

describe('fechas y exportaciones', () => {
	it('formatea dd/mm/aaaa', () => {
		expect(formatearFecha('2026-03-05')).toBe('05/03/2026');
	});

	it('hoy se calcula en hora argentina', () => {
		// 02:00 UTC del 13/11 todavía es 12/11 en Argentina (UTC-3)
		expect(hoyISO(new Date('2026-11-13T02:00:00Z'))).toBe('2026-11-12');
	});

	it('el CSV escapa separadores y evita fórmulas', () => {
		const csv = movimientosACsv([
			{ id: 1, tipo: 'entrega', fecha: '2026-11-12', articulo: 'Guantes', cantidad: 2, empleado: 'Ana', observaciones: '=HYPERLINK("x"); talle L' }
		]);
		expect(csv.startsWith('﻿Fecha;Tipo;Artículo;Cantidad;Empleado;Observaciones\r\n')).toBe(true);
		expect(csv).toContain('12/11/2026;Entrega;Guantes;2;Ana;"\'=HYPERLINK(""x""); talle L"');
	});

	const movimiento = {
		id: 1,
		tipo: 'entrega' as const,
		fecha: '2026-11-12',
		articulo: 'Guantes',
		cantidad: 2,
		empleado: 'Ana',
		observaciones: '=1+1 😀'
	};

	it('el Excel guarda fechas como fechas, cantidades como números y textos sin fórmulas', async () => {
		const libro = new ExcelJS.Workbook();
		await libro.xlsx.load((await movimientosAXlsx([movimiento])).buffer);
		const hoja = libro.getWorksheet('Movimientos')!;
		expect(hoja.getRow(1).values).toEqual([undefined, 'Fecha', 'Tipo', 'Artículo', 'Cantidad', 'Empleado', 'Observaciones']);
		expect(hoja.getRow(2).values).toEqual([undefined, new Date('2026-11-12T00:00:00Z'), 'Entrega', 'Guantes', 2, 'Ana', '=1+1 😀']);
	});

	it('el PDF se genera aunque haya caracteres fuera de Latin-1', async () => {
		const pdf = await movimientosAPdf([movimiento], '2026-11-15');
		expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
	});
});
