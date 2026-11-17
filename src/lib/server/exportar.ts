import { filtrarStock, leerFiltro } from '#lib/estado-stock.js';
import { hoyISO } from '#lib/fechas.js';
import { coincide } from '#lib/texto.js';
import { agruparPorEmpleado, entregasPlanas, listarArticulos, listarEntregas } from './consultas.js';
import type { Db } from './db/index.js';

const TIPOS = {
	csv: 'text/csv; charset=utf-8',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	pdf: 'application/pdf'
};

/** Respuesta de descarga: `nombre-aaaa-mm-dd.formato`, sin caché. */
export function descarga(cuerpo: BodyInit, nombre: string, formato: keyof typeof TIPOS, hoy = hoyISO()): Response {
	return new Response(cuerpo, {
		headers: {
			'Content-Type': TIPOS[formato],
			'Content-Disposition': `attachment; filename="${nombre}-${hoy}.${formato}"`,
			'Cache-Control': 'private, no-store'
		}
	});
}

/** El stock tal como se ve en la página: mismos ?q=, ?estado= y ?categoria=, mismo orden. */
export async function stockParaExportar(db: Db, url: URL) {
	return filtrarStock(
		await listarArticulos(db),
		url.searchParams.get('q') ?? '',
		leerFiltro(url.searchParams.get('estado')),
		url.searchParams.get('categoria') ?? ''
	);
}

/** Las entregas tal como se ven en la página: mismo ?q=, por empleado y de la más nueva a la más vieja. */
export async function entregasParaExportar(db: Db, url: URL) {
	const q = url.searchParams.get('q') ?? '';
	return entregasPlanas(agruparPorEmpleado(await listarEntregas(db)).filter((e) => coincide(e.empleado, q)));
}
