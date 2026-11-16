import { entregasACsv } from '#lib/server/csv.js';
import { descarga, entregasParaExportar } from '#lib/server/exportar.js';
import type { RequestHandler } from './$types';

// Pública, como la página: exporta lo que se ve, con la misma búsqueda.
export const GET: RequestHandler = async ({ locals, url }) => {
	return descarga(entregasACsv(await entregasParaExportar(locals.db, url)), 'entregas-epp', 'csv');
};
