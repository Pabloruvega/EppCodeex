import PDFDocument from 'pdfkit';
import { formatearFecha } from '#lib/fechas.js';
import type { FilaMovimiento } from './consultas.js';

const ENCABEZADO = ['Fecha', 'Tipo', 'Artículo', 'Cant.', 'Empleado', 'Observaciones'];

/** Las fuentes estándar de PDF solo cubren Latin-1: lo demás (emojis, etc.) se reemplaza por "?". */
const latin1 = (s: string | null) => (s ?? '').replace(/[^\x20-\x7e\xa0-\xff]/gu, '?');

/** Listado de movimientos en A4 apaisado. `hoy` es la fecha de generación ('aaaa-mm-dd'). */
export function movimientosAPdf(filas: FilaMovimiento[], hoy: string): Promise<Uint8Array<ArrayBuffer>> {
	const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
	const partes: Buffer[] = [];
	const listo = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
		doc.on('data', (parte: Buffer) => partes.push(parte));
		doc.on('end', () => resolve(new Uint8Array(Buffer.concat(partes))));
		doc.on('error', reject);
	});

	doc.font('Helvetica-Bold').fontSize(14).text('Movimientos de EPP');
	doc
		.font('Helvetica')
		.fontSize(9)
		.fillColor('#555555')
		.text(`Generado el ${formatearFecha(hoy)} - ${filas.length} ${filas.length === 1 ? 'movimiento' : 'movimientos'}`);
	doc.fillColor('#000000').moveDown();

	doc.table({
		columnStyles: [62, 52, '*', { width: 42, align: { x: 'right' } }, '*', '*'],
		rowStyles: (i) => (i === 0 ? { backgroundColor: '#e8ebef' } : undefined),
		defaultStyle: { border: 0.5, borderColor: '#b8bfc7', padding: 4 },
		data: [
			ENCABEZADO.map((text) => ({ text, font: { src: 'Helvetica-Bold' } })),
			...filas.map((f) => [
				formatearFecha(f.fecha),
				f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega',
				latin1(f.articulo),
				String(f.cantidad),
				latin1(f.empleado),
				latin1(f.observaciones)
			])
		]
	});

	doc.end();
	return listo;
}
