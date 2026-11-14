import type { Handle } from '@sveltejs/kit/hooks';
import { DATABASE_URL, SESSION_SECRET } from '$app/env/private';
import { COOKIE_SESION, sesionValida } from '#lib/server/auth.js';
import { crearDb } from '#lib/server/db/index.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = sesionValida(event.cookies.get(COOKIE_SESION), SESSION_SECRET);

	const { db, cerrar } = crearDb(DATABASE_URL);
	event.locals.db = db;
	try {
		const response = await resolve(event);
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
		return response;
	} finally {
		await cerrar();
	}
};
