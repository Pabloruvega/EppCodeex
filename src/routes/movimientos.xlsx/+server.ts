import { error } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { listarMovimientos } from '#lib/server/consultas.js';
import { movimientosAXlsx } from '#lib/server/excel.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 404 y no 403: sin sesión, el recurso directamente no existe.
	if (!locals.admin) error(404, 'No encontrado');

	const xlsx = await movimientosAXlsx(await listarMovimientos(locals.db));
	return new Response(xlsx, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="movimientos-epp-${hoyISO()}.xlsx"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
