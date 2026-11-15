import { fail, redirect } from '@sveltejs/kit';
import { hoyISO } from '#lib/fechas.js';
import { requireAdmin } from '#lib/server/auth.js';
import { listarArticulos, listarEmpleados } from '#lib/server/consultas.js';
import { ErrorUsuario } from '#lib/server/errores.js';
import { registrarEntrega } from '#lib/server/stock.js';
import { leerEntrega } from '#lib/server/validacion.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.admin) redirect(303, '/login');
	const [articulos, nombresEmpleados] = await Promise.all([listarArticulos(locals.db), listarEmpleados(locals.db)]);
	return { articulos, nombresEmpleados, hoy: hoyISO() };
};

const campo = (form: FormData, nombre: string) => String(form.get(nombre) ?? '');

export const actions = {
	default: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		try {
			const entregados = await registrarEntrega(locals.db, leerEntrega(form));
			const detalle = entregados.map((e) => `${e.movimiento.cantidad} × "${e.articulo.nombre}"`).join(', ');
			return { mensaje: `Entrega a ${entregados[0].movimiento.empleado} registrada: ${detalle}.` };
		} catch (e) {
			if (!(e instanceof ErrorUsuario)) throw e;
			// Devolvemos lo enviado para no perder lo escrito (un renglón por artículo).
			const cantidades = form.getAll('cantidad');
			return fail(400, {
				error: e.message,
				valores: {
					empleado: campo(form, 'empleado'),
					fecha: campo(form, 'fecha'),
					observaciones: campo(form, 'observaciones')
				},
				filas: form.getAll('articuloId').map((id, i) => ({ articuloId: String(id), cantidad: String(cantidades[i] ?? '') }))
			});
		}
	}
} satisfies Actions;
