import { agruparPorEmpleado, listarEntregas } from '#lib/server/consultas.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	return {
		empleados: agruparPorEmpleado(await listarEntregas(locals.db)),
		q: url.searchParams.get('q')?.trim() ?? ''
	};
};
