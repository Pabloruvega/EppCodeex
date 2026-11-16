import { hoyISO } from '#lib/fechas.js';
import { descarga, stockParaExportar } from '#lib/server/exportar.js';
import { stockAPdf } from '#lib/server/pdf.js';
import type { RequestHandler } from './$types';

// Pública, como la página: exporta lo que se ve, con la misma búsqueda y filtro.
export const GET: RequestHandler = async ({ locals, url }) => {
	const hoy = hoyISO();
	return descarga(await stockAPdf(await stockParaExportar(locals.db, url), hoy), 'stock-epp', 'pdf', hoy);
};
