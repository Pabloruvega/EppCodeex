import { error } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { listarMovimientos } from '#lib/server/consultas.js';
import { movimientosAPdf } from '#lib/server/pdf.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// 404 y no 403: sin sesión, el recurso directamente no existe.
	if (!locals.admin) error(404, 'No encontrado');

	const hoy = hoyISO();
	const pdf = await movimientosAPdf(await listarMovimientos(locals.db), hoy);
	return new Response(pdf, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="movimientos-epp-${hoy}.pdf"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
