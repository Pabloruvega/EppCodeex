import { redirect } from '@sveltejs/kit';
import { ejecutar } from '#lib/server/acciones.js';
import { requireAdmin } from '#lib/server/auth.js';
import { listarMovimientos } from '#lib/server/consultas.js';
import { borrarMovimiento } from '#lib/server/stock.js';
import { leerId } from '#lib/server/validacion.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Los ingresos nunca salen del servidor sin sesión de admin.
	if (!locals.admin) redirect(303, '/login');
	return { movimientos: await listarMovimientos(locals.db) };
};

export const actions = {
	borrarMovimiento: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('borrarMovimiento', request, async (form) => {
			await borrarMovimiento(locals.db, leerId(form));
			return 'Movimiento eliminado y stock revertido.';
		});
	}
} satisfies Actions;
