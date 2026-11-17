import { categoriaDe, estadoStock, TEXTO_ESTADO } from '#lib/estado-stock.js';
import { formatearFecha } from '#lib/fechas.js';
import type { FilaEntrega, FilaMovimiento, FilaStock } from './consultas.js';

function celda(valor: string | number | null): string {
	let s = valor === null ? '' : String(valor);
	// Evita que Excel interprete el texto como fórmula (inyección CSV).
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** CSV separado por ";" y con BOM, para que Excel en español lo abra bien. */
function aCsv(encabezado: string[], filas: (string | number | null)[][]): string {
	const lineas = filas.map((f) => f.map(celda).join(';'));
	return '﻿' + [encabezado.join(';'), ...lineas].join('\r\n') + '\r\n';
}

export function movimientosACsv(filas: FilaMovimiento[]): string {
	return aCsv(
		['Fecha', 'Tipo', 'Artículo', 'Cantidad', 'Empleado', 'Observaciones'],
		filas.map((f) => [
			formatearFecha(f.fecha),
			f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega',
			f.articulo,
			f.cantidad,
			f.empleado,
			f.observaciones
		])
	);
}

export function stockACsv(filas: FilaStock[]): string {
	return aCsv(
		['Categoría', 'Artículo', 'Stock', 'Mínimo', 'Estado'],
		filas.map((a) => [categoriaDe(a), a.nombre, a.stock, a.stockMinimo, TEXTO_ESTADO[estadoStock(a.stock, a.stockMinimo)]])
	);
}

export function entregasACsv(filas: FilaEntrega[]): string {
	return aCsv(
		['Empleado', 'Fecha', 'Artículo', 'Cantidad', 'Observaciones'],
		filas.map((f) => [f.empleado, formatearFecha(f.fecha), f.articulo, f.cantidad, f.observaciones])
	);
}
