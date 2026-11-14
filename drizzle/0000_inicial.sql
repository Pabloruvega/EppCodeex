CREATE TYPE "public"."tipo_movimiento" AS ENUM('ingreso', 'entrega');--> statement-breakpoint
CREATE TABLE "articulos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"stock_minimo" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articulos_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "articulos_stock_no_negativo" CHECK ("articulos"."stock" >= 0),
	CONSTRAINT "articulos_minimo_no_negativo" CHECK ("articulos"."stock_minimo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "login_intentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_movimiento" NOT NULL,
	"articulo_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"fecha" date NOT NULL,
	"empleado" text,
	"observaciones" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_cantidad_positiva" CHECK ("movimientos"."cantidad" > 0),
	CONSTRAINT "movimientos_empleado_solo_en_entregas" CHECK (("movimientos"."tipo" = 'entrega') = ("movimientos"."empleado" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_articulo_id_articulos_id_fk" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_intentos_ip_idx" ON "login_intentos" USING btree ("ip","creado_en");--> statement-breakpoint
CREATE INDEX "movimientos_fecha_idx" ON "movimientos" USING btree ("fecha" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "movimientos_empleado_idx" ON "movimientos" USING btree ("empleado");--> statement-breakpoint
CREATE INDEX "movimientos_articulo_idx" ON "movimientos" USING btree ("articulo_id");