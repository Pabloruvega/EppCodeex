import { fail } from '@sveltejs/kit';
import { ErrorUsuario } from './errores.js';

/**
 * Lee el formulario, ejecuta la operación y traduce los ErrorUsuario a `fail(400)`.
 * `id` identifica la fila del formulario para mostrar el error al lado.
 */
export async function ejecutar(accion: string, request: Request, operacion: (form: FormData) => Promise<string>) {
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
