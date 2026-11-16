import { stockAXlsx } from '#lib/server/excel.js';
import { descarga, stockParaExportar } from '#lib/server/exportar.js';
import type { RequestHandler } from './$types';

// Pública, como la página: exporta lo que se ve, con la misma búsqueda y filtro.
export const GET: RequestHandler = async ({ locals, url }) => {
	return descarga(await stockAXlsx(await stockParaExportar(locals.db, url)), 'stock-epp', 'xlsx');
};
