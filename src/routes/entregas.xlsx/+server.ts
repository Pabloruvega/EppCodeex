import { entregasAXlsx } from '#lib/server/excel.js';
import { descarga, entregasParaExportar } from '#lib/server/exportar.js';
import type { RequestHandler } from './$types';

// Pública, como la página: exporta lo que se ve, con la misma búsqueda.
export const GET: RequestHandler = async ({ locals, url }) => {
	return descarga(await entregasAXlsx(await entregasParaExportar(locals.db, url)), 'entregas-epp', 'xlsx');
};
