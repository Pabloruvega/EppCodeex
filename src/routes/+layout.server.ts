import { contarAReponer } from '#lib/server/consultas.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	admin: locals.admin,
	aReponer: await contarAReponer(locals.db).catch((error: unknown) => {
		// El contador de la barra es accesorio: si la base falla, no debe tirar abajo todas las páginas.
		console.error('No se pudo contar los artículos a reponer:', error);
		return 0;
	})
});
