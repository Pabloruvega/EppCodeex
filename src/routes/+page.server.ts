import { leerFiltro } from '#lib/estado-stock.js';
import { ejecutar } from '#lib/server/acciones.js';
import { requireAdmin } from '#lib/server/auth.js';
import { listarArticulos } from '#lib/server/consultas.js';
import { borrarArticulo, crearArticulo, editarArticulo, registrarIngreso } from '#lib/server/stock.js';
import { leerArticuloNuevo, leerEdicionArticulo, leerId, leerIngreso } from '#lib/server/validacion.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	return {
		articulos: await listarArticulos(locals.db),
		// Búsqueda y filtro por estado van en la URL: funcionan sin JS y se pueden compartir como enlace.
		q: url.searchParams.get('q')?.trim() ?? '',
		filtro: leerFiltro(url.searchParams.get('estado')),
		categoria: url.searchParams.get('categoria') ?? ''
	};
};

export const actions = {
	crearArticulo: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('crearArticulo', request, async (form) => {
			const articulo = await crearArticulo(locals.db, leerArticuloNuevo(form));
			return `Artículo "${articulo.nombre}" creado.`;
		});
	},

	editarArticulo: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('editarArticulo', request, async (form) => {
			const articulo = await editarArticulo(locals.db, leerEdicionArticulo(form));
			return `"${articulo.nombre}" actualizado.`;
		});
	},

	borrarArticulo: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('borrarArticulo', request, async (form) => {
			const articulo = await borrarArticulo(locals.db, leerId(form));
			return `Artículo "${articulo.nombre}" eliminado.`;
		});
	},

	ingreso: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('ingreso', request, async (form) => {
			const { articulo, movimiento } = await registrarIngreso(locals.db, leerIngreso(form));
			return `Ingreso de ${movimiento.cantidad} × "${articulo.nombre}" registrado. Stock: ${articulo.stock}.`;
		});
	}
} satisfies Actions;
