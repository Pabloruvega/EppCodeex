import { redirect } from '@sveltejs/kit';
import { COOKIE_SESION } from '#lib/server/auth.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(COOKIE_SESION, { path: '/' });
	redirect(303, '/');
};
