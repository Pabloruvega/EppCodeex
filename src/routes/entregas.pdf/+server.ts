import { hoyISO } from '#lib/fechas.js';
import { descarga, entregasParaExportar } from '#lib/server/exportar.js';
import { entregasAPdf } from '#lib/server/pdf.js';
import type { RequestHandler } from './$types';

// Pública, como la página: exporta lo que se ve, con la misma búsqueda.
export const GET: RequestHandler = async ({ locals, url }) => {
	const hoy = hoyISO();
	return descarga(await entregasAPdf(await entregasParaExportar(locals.db, url), hoy), 'entregas-epp', 'pdf', hoy);
};
