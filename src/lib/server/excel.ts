import ExcelJS from 'exceljs';
import { categoriaDe, estadoStock, TEXTO_ESTADO } from '#lib/estado-stock.js';
import type { FilaEntrega, FilaMovimiento, FilaStock } from './consultas.js';

/** Medianoche UTC: Excel no maneja zonas horarias y así el día no se corre. */
const fechaExcel = (iso: string) => new Date(`${iso}T00:00:00Z`);

const columnaFecha = { header: 'Fecha', key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } };

/** Una hoja con el encabezado fijo, en negrita y con filtro. */
async function aXlsx(
	nombre: string,
	columnas: Partial<ExcelJS.Column>[],
	filas: Record<string, unknown>[]
): Promise<Uint8Array<ArrayBuffer>> {
	const libro = new ExcelJS.Workbook();
	const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 1 }] });
	hoja.columns = columnas;
	hoja.getRow(1).font = { bold: true };
	hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
	for (const f of filas) hoja.addRow(f);
	return new Uint8Array(await libro.xlsx.writeBuffer());
}

/** Planilla de movimientos: fechas como fechas, cantidades como números y filtro en el encabezado. */
export function movimientosAXlsx(filas: FilaMovimiento[]) {
	return aXlsx(
		'Movimientos',
		[
			columnaFecha,
			{ header: 'Tipo', key: 'tipo', width: 10 },
			{ header: 'Artículo', key: 'articulo', width: 32 },
			{ header: 'Cantidad', key: 'cantidad', width: 10 },
			{ header: 'Empleado', key: 'empleado', width: 32 },
			{ header: 'Observaciones', key: 'observaciones', width: 48 }
		],
		filas.map((f) => ({
			fecha: fechaExcel(f.fecha),
			tipo: f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega',
			articulo: f.articulo,
			cantidad: f.cantidad,
			empleado: f.empleado,
			observaciones: f.observaciones
		}))
	);
}

export function stockAXlsx(filas: FilaStock[]) {
	return aXlsx(
		'Stock',
		[
			{ header: 'Categoría', key: 'categoria', width: 20 },
			{ header: 'Artículo', key: 'nombre', width: 36 },
			{ header: 'Stock', key: 'stock', width: 10 },
			{ header: 'Mínimo', key: 'stockMinimo', width: 10 },
			{ header: 'Estado', key: 'estado', width: 12 }
		],
		filas.map((a) => ({
			categoria: categoriaDe(a),
			nombre: a.nombre,
			stock: a.stock,
			stockMinimo: a.stockMinimo,
			estado: TEXTO_ESTADO[estadoStock(a.stock, a.stockMinimo)]
		}))
	);
}

export function entregasAXlsx(filas: FilaEntrega[]) {
	return aXlsx(
		'Entregas',
		[
			{ header: 'Empleado', key: 'empleado', width: 32 },
			columnaFecha,
			{ header: 'Artículo', key: 'articulo', width: 32 },
			{ header: 'Cantidad', key: 'cantidad', width: 10 },
			{ header: 'Observaciones', key: 'observaciones', width: 48 }
		],
		filas.map((f) => ({ ...f, fecha: fechaExcel(f.fecha) }))
	);
}
