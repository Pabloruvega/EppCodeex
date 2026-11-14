import { fail, redirect } from '@sveltejs/kit';
import { ADMIN_PASSWORD, SESSION_SECRET } from '$app/env/private';
import { COOKIE_SESION, crearSesion, opcionesCookie, passwordCorrecta } from '#lib/server/auth.js';
import { limpiarIntentos, loginBloqueado, registrarFallo } from '#lib/server/limite-login.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.admin) redirect(303, '/');
};

export const actions = {
	default: async ({ locals, request, cookies, getClientAddress }) => {
		const ip = getClientAddress();
		if (await loginBloqueado(locals.db, ip)) {
			return fail(429, { error: 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.' });
		}

		const password = (await request.formData()).get('password');
		if (typeof password !== 'string' || !passwordCorrecta(password, ADMIN_PASSWORD)) {
			await registrarFallo(locals.db, ip);
			return fail(401, { error: 'Contraseña incorrecta.' });
		}

		await limpiarIntentos(locals.db, ip);
		cookies.set(COOKIE_SESION, crearSesion(SESSION_SECRET), opcionesCookie);
		redirect(303, '/');
	}
} satisfies Actions;
