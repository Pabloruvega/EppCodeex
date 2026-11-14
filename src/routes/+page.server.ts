import { fail } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { requireAdmin } from '#lib/server/auth.js';
import { agruparPorEmpleado, listarArticulos, listarEmpleados, listarEntregas, listarMovimientos } from '#lib/server/consultas.js';
import { ErrorUsuario } from '#lib/server/errores.js';
import {
	borrarArticulo,
	borrarMovimiento,
	crearArticulo,
	editarArticulo,
	registrarEntrega,
	registrarIngreso
} from '#lib/server/stock.js';
import { leerArticuloNuevo, leerEdicionArticulo, leerEntrega, leerId, leerIngreso } from '#lib/server/validacion.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { db, admin } = locals;
	const [articulos, entregas] = await Promise.all([listarArticulos(db), listarEntregas(db)]);

	return {
		admin,
		articulos,
		empleados: agruparPorEmpleado(entregas),
		q: url.searchParams.get('q')?.trim() ?? '',
		hoy: hoyISO(),
		// Los ingresos nunca salen del servidor sin sesión de admin.
		movimientos: admin ? await listarMovimientos(db) : [],
		nombresEmpleados: admin ? await listarEmpleados(db) : []
	};
};

/**
 * Lee el formulario, ejecuta la operación y traduce los ErrorUsuario a `fail(400)`.
 * `id` identifica la fila del formulario para mostrar el error al lado.
 */
async function ejecutar(accion: string, request: Request, operacion: (form: FormData) => Promise<string>) {
	const form = await request.formData();
	const id = String(form.get('id') ?? form.get('articuloId') ?? '');
	try {
		const mensaje = await operacion(form);
		return { accion, id, mensaje };
	} catch (e) {
		if (!(e instanceof ErrorUsuario)) throw e;
		const valores = Object.fromEntries([...form].filter((par): par is [string, string] => typeof par[1] === 'string'));
		return fail(400, { accion, id, error: e.message, valores });
	}
}

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
	},

	entrega: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('entrega', request, async (form) => {
			const { articulo, movimiento } = await registrarEntrega(locals.db, leerEntrega(form));
			return `Entrega de ${movimiento.cantidad} × "${articulo.nombre}" a ${movimiento.empleado} registrada. Quedan ${articulo.stock}.`;
		});
	},

	borrarMovimiento: async ({ locals, request }) => {
		requireAdmin(locals);
		return ejecutar('borrarMovimiento', request, async (form) => {
			await borrarMovimiento(locals.db, leerId(form));
			return 'Movimiento eliminado y stock revertido.';
		});
	}
} satisfies Actions;
