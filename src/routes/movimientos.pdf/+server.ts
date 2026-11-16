import { error } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { listarMovimientos } from '#lib/server/consultas.js';
import { descarga } from '#lib/server/exportar.js';
import { movimientosAPdf } from '#lib/server/pdf.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 404 y no 403: sin sesión, el recurso directamente no existe.
	if (!locals.admin) error(404, 'No encontrado');

	const hoy = hoyISO();
	return descarga(await movimientosAPdf(await listarMovimientos(locals.db), hoy), 'movimientos-epp', 'pdf', hoy);
};
