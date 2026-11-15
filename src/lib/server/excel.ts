import ExcelJS from 'exceljs';
import type { FilaMovimiento } from './consultas.js';

/** Planilla de movimientos: fechas como fechas, cantidades como números y filtro en el encabezado. */
export async function movimientosAXlsx(filas: FilaMovimiento[]): Promise<Uint8Array<ArrayBuffer>> {
	const libro = new ExcelJS.Workbook();
	const hoja = libro.addWorksheet('Movimientos', { views: [{ state: 'frozen', ySplit: 1 }] });
	hoja.columns = [
		{ header: 'Fecha', key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
		{ header: 'Tipo', key: 'tipo', width: 10 },
		{ header: 'Artículo', key: 'articulo', width: 32 },
		{ header: 'Cantidad', key: 'cantidad', width: 10 },
		{ header: 'Empleado', key: 'empleado', width: 32 },
		{ header: 'Observaciones', key: 'observaciones', width: 48 }
	];
	hoja.getRow(1).font = { bold: true };
	hoja.autoFilter = 'A1:F1';

	for (const f of filas) {
		hoja.addRow({
			// Medianoche UTC: Excel no maneja zonas horarias y así el día no se corre.
			fecha: new Date(`${f.fecha}T00:00:00Z`),
			tipo: f.tipo === 'ingreso' ? 'Ingreso' : 'Entrega',
			articulo: f.articulo,
			cantidad: f.cantidad,
			empleado: f.empleado,
			observaciones: f.observaciones
		});
	}
	return new Uint8Array(await libro.xlsx.writeBuffer());
}
