import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';

export const COOKIE_SESION = 'epp_sesion';
export const DURACION_SESION_SEG = 60 * 60 * 24 * 30; // 30 días

export const opcionesCookie = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	maxAge: DURACION_SESION_SEG
} as const;

function firmar(dato: string, secreto: string): string {
	return createHmac('sha256', secreto).update(dato).digest('base64url');
}

function igualesEnTiempoConstante(a: string, b: string): boolean {
	// Comparamos hashes para que los buffers tengan siempre el mismo largo.
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** Valor de la cookie: "<vencimiento en ms>.<firma HMAC>". */
export function crearSesion(secreto: string, ahora = Date.now()): string {
	const vence = String(ahora + DURACION_SESION_SEG * 1000);
	return `${vence}.${firmar(vence, secreto)}`;
}

export function sesionValida(valor: string | undefined, secreto: string, ahora = Date.now()): boolean {
	if (!valor) return false;
	const [vence, firma, ...resto] = valor.split('.');
	if (!vence || !firma || resto.length > 0) return false;
	if (!igualesEnTiempoConstante(firma, firmar(vence, secreto))) return false;
	return Number(vence) > ahora;
}

export function passwordCorrecta(ingresada: string, real: string): boolean {
	return igualesEnTiempoConstante(ingresada, real);
}

/** Corta la request con 403 si no hay sesión de admin. Usar en toda escritura. */
export function requireAdmin(locals: App.Locals): void {
	if (!locals.admin) error(403, 'Necesitás iniciar sesión como administrador.');
}
