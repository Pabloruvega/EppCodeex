import { error } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { listarMovimientos } from '#lib/server/consultas.js';
import { movimientosACsv } from '#lib/server/csv.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 404 y no 403: sin sesión, el recurso directamente no existe.
	if (!locals.admin) error(404, 'No encontrado');

	const csv = movimientosACsv(await listarMovimientos(locals.db));
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="movimientos-epp-${hoyISO()}.csv"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
