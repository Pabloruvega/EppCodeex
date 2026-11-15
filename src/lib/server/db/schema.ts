import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const articulos = pgTable(
	'articulos',
	{
		id: serial('id').primaryKey(),
		nombre: text('nombre').notNull().unique(),
		stock: integer('stock').notNull().default(0),
		stockMinimo: integer('stock_minimo').notNull().default(0),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('articulos_stock_no_negativo', sql`${t.stock} >= 0`),
		check('articulos_minimo_no_negativo', sql`${t.stockMinimo} >= 0`)
	]
);

export const tipoMovimiento = pgEnum('tipo_movimiento', ['ingreso', 'entrega']);

export const movimientos = pgTable(
	'movimientos',
	{
		id: serial('id').primaryKey(),
		tipo: tipoMovimiento('tipo').notNull(),
		articuloId: integer('articulo_id')
			.notNull()
			.references(() => articulos.id, { onDelete: 'cascade' }),
		cantidad: integer('cantidad').notNull(),
		fecha: date('fecha', { mode: 'string' }).notNull(),
		// nombre del empleado; solo en entregas
		empleado: text('empleado'),
		observaciones: text('observaciones'),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('movimientos_cantidad_positiva', sql`${t.cantidad} > 0`),
		check('movimientos_empleado_solo_en_entregas', sql`(${t.tipo} = 'entrega') = (${t.empleado} IS NOT NULL)`),
		index('movimientos_fecha_idx').on(t.fecha.desc(), t.id.desc()),
		index('movimientos_empleado_idx').on(t.empleado),
		index('movimientos_articulo_idx').on(t.articuloId)
	]
);

export const loginIntentos = pgTable(
	'login_intentos',
	{
		id: serial('id').primaryKey(),
		ip: text('ip').notNull(),
		creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('login_intentos_ip_idx').on(t.ip, t.creadoEn)]
);

export type Articulo = typeof articulos.$inferSelect;
export type Movimiento = typeof movimientos.$inferSelect;
