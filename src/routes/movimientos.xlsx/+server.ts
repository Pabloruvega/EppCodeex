import { error } from '@sveltejs/kit';
import { listarMovimientos } from '#lib/server/consultas.js';
import { movimientosAXlsx } from '#lib/server/excel.js';
import { descarga } from '#lib/server/exportar.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 404 y no 403: sin sesión, el recurso directamente no existe.
	if (!locals.admin) error(404, 'No encontrado');

	return descarga(await movimientosAXlsx(await listarMovimientos(locals.db)), 'movimientos-epp', 'xlsx');
};
