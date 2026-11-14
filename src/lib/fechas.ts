const ZONA = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy en Argentina como 'aaaa-mm-dd' (formato de <input type="date"> y de Postgres). */
export function hoyISO(ahora = new Date()): string {
	// en-CA formatea como aaaa-mm-dd
	return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(ahora);
}

/** 'aaaa-mm-dd' → 'dd/mm/aaaa' */
export function formatearFecha(iso: string): string {
	const [a, m, d] = iso.split('-');
	return `${d}/${m}/${a}`;
}

export function esFechaISOValida(valor: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
	const fecha = new Date(`${valor}T00:00:00Z`);
	return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}
