import { esFechaISOValida } from '#lib/fechas.js';
import { ErrorUsuario } from './errores.js';

const MAX_CANTIDAD = 100_000;
const MAX_ITEMS_ENTREGA = 50;

function texto(form: FormData, campo: string): string {
	const valor = form.get(campo);
	return typeof valor === 'string' ? valor.trim() : '';
}

type OpcionesEntero = { min: number; opcional?: boolean };

function entero(form: FormData, campo: string, etiqueta: string, opciones: OpcionesEntero): number {
	return validarEntero(texto(form, campo), etiqueta, opciones);
}

function validarEntero(valor: string, etiqueta: string, { min, opcional = false }: OpcionesEntero): number {
	if (valor === '' && opcional) return 0;
	if (!/^\d+$/.test(valor)) throw new ErrorUsuario(`${etiqueta}: ingresá un número entero.`);
	const n = Number(valor);
	if (n < min || n > MAX_CANTIDAD) throw new ErrorUsuario(`${etiqueta}: tiene que estar entre ${min} y ${MAX_CANTIDAD}.`);
	return n;
}

export function leerId(form: FormData, campo = 'id'): number {
	return entero(form, campo, 'Identificador', { min: 1 });
}

/** Normaliza "  123 -  Juan   Pérez " → "123 - Juan Pérez". */
export function normalizarEmpleado(valor: string): string | null {
	const m = valor.trim().match(/^(\S+?)\s*-\s*(.+)$/);
	if (!m) return null;
	const nombre = m[2].replace(/\s+/g, ' ').trim();
	return nombre ? `${m[1]} - ${nombre}` : null;
}

export function leerArticuloNuevo(form: FormData) {
	const nombre = texto(form, 'nombre').replace(/\s+/g, ' ');
	if (!nombre) throw new ErrorUsuario('Ingresá el nombre del artículo.');
	if (nombre.length > 100) throw new ErrorUsuario('El nombre es demasiado largo (máximo 100 caracteres).');
	return {
		nombre,
		stock: entero(form, 'stock', 'Stock inicial', { min: 0 }),
		stockMinimo: entero(form, 'stockMinimo', 'Stock mínimo', { min: 0, opcional: true })
	};
}

export function leerEdicionArticulo(form: FormData) {
	return {
		id: leerId(form),
		stock: entero(form, 'stock', 'Stock', { min: 0 }),
		stockMinimo: entero(form, 'stockMinimo', 'Stock mínimo', { min: 0 })
	};
}

export function leerIngreso(form: FormData) {
	return {
		articuloId: leerId(form, 'articuloId'),
		cantidad: entero(form, 'cantidad', 'Cantidad', { min: 1 })
	};
}

export function leerEntrega(form: FormData) {
	const empleado = normalizarEmpleado(texto(form, 'empleado'));
	if (!empleado) throw new ErrorUsuario('Empleado: usá el formato "legajo - nombre" (por ejemplo "123 - Juan Pérez").');
	if (empleado.length > 120) throw new ErrorUsuario('Empleado: el texto es demasiado largo.');

	const items = leerItemsEntrega(form);

	const fecha = texto(form, 'fecha');
	if (!esFechaISOValida(fecha)) throw new ErrorUsuario('Fecha inválida.');

	const observaciones = texto(form, 'observaciones');
	if (observaciones.length > 500) throw new ErrorUsuario('Observaciones: máximo 500 caracteres.');

	return { empleado, items, fecha, observaciones: observaciones || null };
}

/**
 * Un renglón por artículo: los campos `articuloId` y `cantidad` se repiten en el mismo orden.
 * Los renglones sin artículo se ignoran y los artículos repetidos se suman.
 */
function leerItemsEntrega(form: FormData) {
	const ids = form.getAll('articuloId');
	const cantidades = form.getAll('cantidad');
	if (ids.length > MAX_ITEMS_ENTREGA) throw new ErrorUsuario(`Una entrega admite hasta ${MAX_ITEMS_ENTREGA} artículos.`);

	const porArticulo = new Map<number, number>();
	ids.forEach((id, i) => {
		if (typeof id !== 'string' || !id.trim()) return;
		const articuloId = validarEntero(id.trim(), 'Identificador', { min: 1 });
		const cantidad = cantidades[i];
		const n = validarEntero(typeof cantidad === 'string' ? cantidad.trim() : '', 'Cantidad', { min: 1 });
		porArticulo.set(articuloId, (porArticulo.get(articuloId) ?? 0) + n);
	});
	if (porArticulo.size === 0) throw new ErrorUsuario('Elegí al menos un artículo.');

	return [...porArticulo].map(([articuloId, cantidad]) => ({ articuloId, cantidad }));
}
