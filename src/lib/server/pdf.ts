import PDFDocument from 'pdfkit';
import { categoriaDe, estadoStock, TEXTO_ESTADO } from '#lib/estado-stock.js';
import { formatearFecha } from '#lib/fechas.js';
import type { FilaEntrega, FilaMovimiento, FilaStock } from './consultas.js';

/** Las fuentes estándar de PDF solo cubren Latin-1: lo demás (emojis, etc.) se reemplaza por "?". */
const latin1 = (s: string) => s.replace(/[^\x20-\x7e\xa0-\xff]/gu, '?');

type Columna = { titulo: string; ancho: number | '*'; derecha?: boolean };

type Listado = {
	titulo: string;
	/** Fecha de generación ('aaaa-mm-dd'). */
	hoy: string;
	/** Qué se cuenta en el subtítulo: [singular, plural]. */
	unidad: [string, string];
	apaisado?: boolean;
	columnas: Columna[];
	filas: string[][];
};

/** Listado en A4: título, fecha de generación y una tabla. */
function aPdf({ titulo, hoy, unidad, apaisado, columnas, filas }: Listado): Promise<Uint8Array<ArrayBuffer>> {
	const doc = new PDFDocument({ size: 'A4', layout: apaisado ? 'landscape' : 'portrait', margin: 36 });
	const partes: Buffer[] = [];
	const listo = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
		doc.on('data', (parte: Buffer) => partes.push(parte));
		doc.on('end', () => resolve(new Uint8Array(Buffer.concat(partes))));
		doc.on('error', reject);
	});

	doc.font('Helvetica-Bold').fontSize(14).text(titulo);
	doc
		.font('Helvetica')
		.fontSize(9)
		.fillColor('#555555')
		.text(`Generado el ${formatearFecha(hoy)} - ${filas.length} ${latin1(unidad[filas.length === 1 ? 0 : 1])}`);
	doc.fillColor('#000000').moveDown();

	doc.table({
		columnStyles: columnas.map((c) => (c.derecha ? { width: c.ancho, align: { x: 'right' as const } } : c.ancho)),
		rowStyles: (i) => (i === 0 ? { backgroundColor: '#e8ebef' } : undefined),
		defaultStyle: { border: 0.5, borderColor: '#b8bfc7', padding: 4 },
		data: [
			columnas.map((c) => ({ text: c.titulo, font: { src: 'Helvetica-Bold' } })),
			...filas.map((f) => f.map(latin1))
		]
	});

	doc.end();
	return listo;
}

/** Listado de movimientos en A4 apaisado. `hoy` es la fecha de generación ('aaaa-mm-dd'). */
export function movimientosAPdf(filas: FilaMovimiento[], hoy: string) {
	return aPdf({
		titulo: 'Movimientos de EPP',
		hoy,
		unidad: ['movimiento', 'movimientos'],
		apaisado: true,
		columnas: [
			{ titulo: 'Fecha', ancho: 62 },
			{ titulo: 'Tipo', ancho: 52 },
			{ titulo: 'Artículo', ancho: '*' },
			{ titulo: 'Cant.', ancho: 42, derecha: true },
			{ titulo: 'Empleado', ancho: '*' },
			{ titulo: 'Observaciones', ancho: '*' }
		],
		filas: filas.map((f) => [
			formatearFecha(f.fecha),
			f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega',
			f.articulo,
			String(f.cantidad),
			f.empleado ?? '',
			f.observaciones ?? ''
		])
	});
}

/** Listado de stock en A4 vertical, con el estado de cada artículo. */
export function stockAPdf(filas: FilaStock[], hoy: string) {
	return aPdf({
		titulo: 'Stock de EPP',
		hoy,
		unidad: ['artículo', 'artículos'],
		columnas: [
			{ titulo: 'Categoría', ancho: 110 },
			{ titulo: 'Artículo', ancho: '*' },
			{ titulo: 'Stock', ancho: 50, derecha: true },
			{ titulo: 'Mínimo', ancho: 50, derecha: true },
			{ titulo: 'Estado', ancho: 60 }
		],
		filas: filas.map((a) => [
			categoriaDe(a),
			a.nombre,
			String(a.stock),
			String(a.stockMinimo),
			TEXTO_ESTADO[estadoStock(a.stock, a.stockMinimo)]
		])
	});
}

/** Listado de entregas en A4 apaisado, un renglón por entrega. */
export function entregasAPdf(filas: FilaEntrega[], hoy: string) {
	return aPdf({
		titulo: 'Entregas de EPP por empleado',
		hoy,
		unidad: ['entrega', 'entregas'],
		apaisado: true,
		columnas: [
			{ titulo: 'Legajo', ancho: 52 },
			{ titulo: 'Empleado', ancho: '*' },
			{ titulo: 'Fecha', ancho: 62 },
			{ titulo: 'Artículo', ancho: '*' },
			{ titulo: 'Cant.', ancho: 42, derecha: true },
			{ titulo: 'Observaciones', ancho: '*' }
		],
		filas: filas.map((f) => [
			f.legajo,
			f.nombre,
			formatearFecha(f.fecha),
			f.articulo,
			String(f.cantidad),
			f.observaciones ?? ''
		])
	});
}
