import { formatearFecha } from '#lib/fechas.js';
import type { FilaMovimiento } from './consultas.js';

function celda(valor: string | number | null): string {
	let s = valor === null ? '' : String(valor);
	// Evita que Excel interprete el texto como fórmula (inyección CSV).
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** CSV separado por ";" y con BOM, para que Excel en español lo abra bien. */
export function movimientosACsv(filas: FilaMovimiento[]): string {
	const encabezado = ['Fecha', 'Tipo', 'Artículo', 'Cantidad', 'Empleado', 'Observaciones'];
	const lineas = filas.map((f) =>
		[formatearFecha(f.fecha), f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega', f.articulo, f.cantidad, f.empleado, f.observaciones]
			.map(celda)
			.join(';')
	);
	return '﻿' + [encabezado.join(';'), ...lineas].join('\r\n') + '\r\n';
}
