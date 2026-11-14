import { isHttpError } from '@sveltejs/kit';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearSesion, passwordCorrecta, sesionValida } from '#lib/server/auth.js';
import { articulos, movimientos } from '#lib/server/db/schema.js';
import { crearArticulo, registrarEntrega, registrarIngreso } from '#lib/server/stock.js';
import { actions, load } from '../src/routes/+page.server.js';
import { GET as exportarCsv } from '../src/routes/movimientos.csv/+server.js';
import { crearDbTest } from './db-test.js';

const { db, vaciar } = await crearDbTest();

// Eventos mínimos: las actions y el load solo usan locals, request y url.
type CualquierEvento = any;

function evento(admin: boolean, campos: Record<string, string> = {}): CualquierEvento {
	const body = new FormData();
	for (const [k, v] of Object.entries(campos)) body.set(k, v);
	return {
		locals: { admin, db },
		url: new URL('http://localhost/'),
		request: new Request('http://localhost/', { method: 'POST', body })
	};
}

async function esperarProhibido(promesa: Promise<unknown>, status: number) {
	const e = await promesa.then(
		() => null,
		(err: unknown) => err
	);
	expect(isHttpError(e, status as 403)).toBe(true);
}

describe('acceso sin sesión', () => {
	let articuloId: number;
	let movimientoId: number;

	beforeEach(async () => {
		await vaciar();
		articuloId = (await crearArticulo(db, { nombre: 'Casco', stock: 10, stockMinimo: 1 })).id;
		await registrarIngreso(db, { articuloId, cantidad: 7 });
		movimientoId = (
			await registrarEntrega(db, { articuloId, cantidad: 2, fecha: '2026-11-12', empleado: '5 - Ana', observaciones: null })
		).movimiento.id;
	});

	const intentos: [keyof typeof actions, () => Record<string, string>][] = [
		['crearArticulo', () => ({ nombre: 'Botines', stock: '3' })],
		['editarArticulo', () => ({ id: String(articuloId), stock: '0', stockMinimo: '0' })],
		['borrarArticulo', () => ({ id: String(articuloId) })],
		['ingreso', () => ({ articuloId: String(articuloId), cantidad: '5' })],
		['entrega', () => ({ articuloId: String(articuloId), cantidad: '1', fecha: '2026-11-12', empleado: '1 - X' })],
		['borrarMovimiento', () => ({ id: String(movimientoId) })]
	];

	it.each(intentos)('la action %s responde 403 y no modifica nada', async (nombre, campos) => {
		const antes = { a: await db.select().from(articulos), m: await db.select().from(movimientos) };
		await esperarProhibido(Promise.resolve().then(() => actions[nombre](evento(false, campos()))), 403);
		expect(await db.select().from(articulos)).toEqual(antes.a);
		expect(await db.select().from(movimientos)).toEqual(antes.m);
	});

	it('el load público no incluye ingresos ni la lista de movimientos', async () => {
		const data = (await load(evento(false))) as Record<string, unknown>;
		expect(data.movimientos).toEqual([]);
		expect(data.nombresEmpleados).toEqual([]);
		expect(JSON.stringify(data)).not.toContain('ingreso');
		// las entregas sí son públicas
		expect(JSON.stringify(data.empleados)).toContain('5 - Ana');
	});

	it('el CSV responde 404 sin sesión', async () => {
		await esperarProhibido(Promise.resolve().then(() => exportarCsv(evento(false))), 404);
	});
});

describe('acceso con sesión de admin', () => {
	beforeEach(vaciar);

	it('puede escribir y ve los ingresos', async () => {
		const creado = await actions.crearArticulo(evento(true, { nombre: 'Botines', stock: '3' }));
		expect(creado).toMatchObject({ mensaje: 'Artículo "Botines" creado.' });

		const [{ id }] = await db.select().from(articulos);
		await actions.ingreso(evento(true, { articuloId: String(id), cantidad: '2' }));

		const data = (await load(evento(true))) as { movimientos: { tipo: string }[] };
		expect(data.movimientos.map((m) => m.tipo)).toEqual(['ingreso']);

		const csv = await (await exportarCsv(evento(true))).text();
		expect(csv).toContain('Ingreso;Botines;2');
	});

	it('una entrega sin stock suficiente devuelve 400 con el mensaje', async () => {
		const { id } = await crearArticulo(db, { nombre: 'Antiparras', stock: 1, stockMinimo: 0 });
		const r = await actions.entrega(
			evento(true, { articuloId: String(id), cantidad: '2', fecha: '2026-11-12', empleado: '1 - Ana' })
		);
		expect(r).toMatchObject({ status: 400, data: { error: expect.stringMatching(/Stock insuficiente/) } });
	});
});

describe('sesión', () => {
	const secreto = 'x'.repeat(32);

	it('acepta una cookie firmada vigente', () => {
		expect(sesionValida(crearSesion(secreto), secreto)).toBe(true);
	});

	it('rechaza cookies vencidas, adulteradas o firmadas con otro secreto', () => {
		const ahora = Date.now();
		const valor = crearSesion(secreto, ahora);
		const [vence, firma] = valor.split('.');
		expect(sesionValida(valor, secreto, ahora + 31 * 24 * 3600 * 1000)).toBe(false);
		expect(sesionValida(`${Number(vence) + 1}.${firma}`, secreto)).toBe(false);
		expect(sesionValida(valor, 'y'.repeat(32))).toBe(false);
		expect(sesionValida(undefined, secreto)).toBe(false);
		expect(sesionValida('basura', secreto)).toBe(false);
	});

	it('compara contraseñas', () => {
		expect(passwordCorrecta('secreta123', 'secreta123')).toBe(true);
		expect(passwordCorrecta('secreta12', 'secreta123')).toBe(false);
	});
});
