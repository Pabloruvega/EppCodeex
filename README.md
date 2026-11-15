# Stock de EPP

Control de stock de equipos de protección personal, con una barra lateral para moverse entre secciones:

- **Público (sin login):** stock actual y entregas por empleado (solo lectura).
- **Admin (contraseña única):** alta, edición y borrado de artículos, ingresos, entregas (de uno o varios artículos a la vez), lista de movimientos y exportación a Excel, PDF y CSV.

Stack: SvelteKit 3 + TypeScript, `@sveltejs/adapter-vercel`, Neon Postgres, Drizzle ORM, Vitest.

## Requisitos

- Node **22.17 o superior** (es el mínimo de SvelteKit 3; desde Node 22 hay `WebSocket` nativo, que usa el driver de Neon).
- Una base Neon. El driver `@neondatabase/serverless` se conecta por WebSocket, así que **no funciona contra un Postgres local común**. Para desarrollar, usá una rama de Neon (ver más abajo).

## Estructura

```
src/
  env.ts                        variables de entorno (validadas al arrancar)
  hooks.server.ts               sesión → locals.admin; crea/cierra la conexión por request → locals.db
  lib/fechas.ts                 hoy en Argentina, formato dd/mm/aaaa
  lib/server/
    db/schema.ts, db/index.ts   esquema Drizzle y conexión
    stock.ts                    operaciones que modifican stock (en transacción)
    consultas.ts                lecturas para la página
    auth.ts                     cookie firmada, comparación en tiempo constante, requireAdmin()
    limite-login.ts             5 intentos por IP cada 15 minutos (en la base)
    acciones.ts                 ejecuta una action y traduce los ErrorUsuario a fail(400)
    validacion.ts
    excel.ts, pdf.ts, csv.ts    exportaciones de movimientos
  routes/
    +layout.server.ts / .svelte barra lateral (las secciones de admin solo aparecen con sesión)
    +page.server.ts / .svelte   stock: público; con sesión, edición, ingresos y altas
    nueva-entrega/              entrega de uno o varios artículos (solo admin)
    entregas/                   entregas por empleado (público)
    movimientos/                ingresos y entregas, con borrado (solo admin)
    login/                      formulario de login
    logout/+server.ts           POST: borra la cookie
    movimientos.{xlsx,pdf,csv}/ exportaciones (solo admin; 404 si no)
drizzle/                        migraciones SQL generadas
tests/                          Vitest (PGlite: Postgres en memoria)
```

## Correr en local

```sh
npm install
cp .env.example .env     # y completá los valores (ver "Variables de entorno")
npm run db:migrate       # crea las tablas en la base de DATABASE_URL
npm run dev
```

Abrí <http://localhost:5173>. Para entrar como admin, andá a `/login`.

> **Base para desarrollo:** en la consola de Neon (Vercel → Storage → tu base → *Open in Neon*) creá una rama `dev` y usá su connection string en tu `.env`. Así no tocás los datos reales.

### Tests

```sh
npm test          # una corrida
npm run test:unit # modo watch
npm run check     # tipos (svelte-check)
```

Los tests no necesitan Neon: usan [PGlite](https://pglite.dev) (Postgres compilado a WASM, en memoria) y aplican las mismas migraciones de `drizzle/`. Cubren:

- `tests/stock.spec.ts`: entrega, ingreso, borrado con reversión, stock insuficiente, concurrencia y borrado en cascada.
- `tests/acceso.spec.ts`: sin sesión, toda action responde 403 sin modificar la base, los `load` públicos no envían ingresos, las páginas de admin redirigen al login y las exportaciones dan 404. Además, validez de la cookie.
- `tests/validacion.spec.ts`: parseo de formularios, fechas y exportaciones (Excel, PDF y escapado del CSV).

### Build local en Windows

`adapter-vercel` crea symlinks en `.vercel/output`. En Windows eso requiere activar el **Modo de desarrollador** (Configuración → Sistema → Para programadores); si no, `npm run build` falla en el último paso con `EPERM: symlink`. En Vercel (Linux) no pasa.

## Variables de entorno

| Variable | Qué es |
| --- | --- |
| `DATABASE_URL` | Connection string de Neon (pooled). La inyecta la integración de Vercel. |
| `DATABASE_URL_UNPOOLED` | Conexión directa. También la inyecta la integración. La usa solo `drizzle-kit` para migrar; si no existe, se usa `DATABASE_URL`. |
| `ADMIN_PASSWORD` | Contraseña del admin (mínimo 8 caracteres). |
| `SESSION_SECRET` | Secreto para firmar la cookie (mínimo 32 caracteres). |

Generar un `SESSION_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Se declaran en `src/env.ts`: si falta alguna o no cumple el largo mínimo, la app no arranca ni compila. **Cambiar `SESSION_SECRET` cierra todas las sesiones abiertas** (la sesión no se guarda en la base; la cookie se firma con HMAC y dura 30 días).

## Crear la base en Neon desde Vercel

1. Subí el repo a GitHub e importalo en Vercel (**Add New → Project**). Vercel detecta SvelteKit solo.
2. En el proyecto, **Storage → Create Database → Neon** (Marketplace). Elegí región (por ejemplo `sa-east-1`, São Paulo), plan y nombre.
3. En la base creada: **Connect Project** → elegí este proyecto y los entornos (*Development*, *Preview*, *Production*). Esto inyecta `DATABASE_URL`, `DATABASE_URL_UNPOOLED` y otras variables.
   - Opcional: activá **Preview** en *Create database branch for deployment*. Así cada preview tiene su propia rama de la base.
4. En **Settings → Environment Variables** agregá `ADMIN_PASSWORD` y `SESSION_SECRET` (para *Production* y, si querés, *Preview*).
5. Para traer las variables a tu máquina:

   ```sh
   npx vercel link
   npx vercel env pull .env
   ```

   (Si vas a desarrollar sobre una rama `dev`, reemplazá después `DATABASE_URL` en `.env`).

## Migraciones

Las migraciones están versionadas en `drizzle/`. Si cambiás `src/lib/server/db/schema.ts`:

```sh
npm run db:generate -- --name descripcion_del_cambio
npm run db:migrate
```

**Cada deploy aplica las migraciones pendientes** (incluidas las ramas de preview): `vercel.json` define como comando de build `npm run db:migrate && npm run build`. Si la migración falla, el deploy no sale.

Las variables que inyecta Neon son *sensitive*: `vercel env pull` no trae su valor, así que para migrar a mano hay que copiar el connection string desde la consola de Neon al `.env`.

## Desplegar

1. Verificá que en **Settings → Build and Deployment → Node.js Version** esté 22.x o superior.
2. Push a la rama principal → Vercel aplica las migraciones, compila y despliega.
3. Entrá a `https://tu-proyecto.vercel.app/login`, cargá los artículos y listo.

## Decisiones

- **Una conexión por request.** Neon recomienda crear y cerrar el `Pool` dentro de cada request en Vercel Functions. Lo hace `hooks.server.ts` y lo expone como `locals.db`, lo que además permite inyectar PGlite en los tests.
- **Driver `neon-serverless` (WebSocket) y no `neon-http`**: `neon-http` no soporta transacciones interactivas.
- **Una entrega de varios artículos es todo o nada.** Se registra un movimiento por artículo dentro de una misma transacción; si falta stock de uno, no se descuenta ninguno. No hay tabla de "entregas": cada movimiento se puede borrar por separado.
- **Stock nunca negativo.** Las restas usan `UPDATE … WHERE stock >= n` dentro de la transacción, y hay un `CHECK (stock >= 0)` de respaldo.
- **Borrar un artículo borra sus movimientos** (`ON DELETE CASCADE`); la confirmación avisa cuántos son.
- **No se puede borrar un ingreso** si el stock quedaría negativo (ya se entregó).
- **Editar stock/mínimo en la tabla** es una corrección directa y no genera movimiento.
- **Los ingresos nunca salen del servidor sin sesión.** El `load` solo los consulta si `locals.admin`, y toda action llama a `requireAdmin()`.
- **Límite de login en la base**, porque las instancias serverless no comparten memoria.
- **No indexable:** `<meta name="robots" content="noindex">`, cabecera `X-Robots-Tag` y `robots.txt` con `Disallow: /`.
- **Sin JS también funciona.** Las confirmaciones son `<details>` con el botón adentro (no `confirm()`), el autocompletado de empleados es un `<datalist>` y el buscador es un formulario GET. Con JS, `use:enhance` evita recargar la página y el buscador filtra mientras escribís. La única excepción: sin JS, la entrega admite un solo artículo (agregar renglones necesita JS).
- **Instalable como app (PWA), sin service worker.** Alcanza con `static/manifest.webmanifest` y los íconos: Chrome y Edge ya no exigen service worker para instalar, y la app no sirve sin conexión porque todo sale de la base. Así tampoco se cachean páginas con datos de admin. El botón "Instalar app" aparece cuando el navegador lo permite; en iPhone se instala desde Compartir → "Agregar a inicio".
- **CSS propio**, sin Tailwind. Son pocas páginas; con variables CSS y `prefers-color-scheme` alcanza para el modo oscuro, sin sumar dependencias ni un paso de build.
- **CSV con `;` y BOM**, para que Excel en español lo abra con las columnas y los acentos bien. Los textos que empiezan con `=`, `+`, `-` o `@` se prefijan con `'` para evitar inyección de fórmulas.

### Dependencias

| Paquete | Por qué |
| --- | --- |
| `drizzle-orm`, `@neondatabase/serverless` | ORM y driver de Neon (stack pedido). |
| `exceljs` | Exportar los movimientos a `.xlsx` con fechas y números reales. |
| `pdfkit` (+ `@types/pdfkit` dev) | Exportar los movimientos a PDF. Usa las fuentes estándar de PDF (Latin-1): un emoji en las observaciones sale como `?`. |
| `drizzle-kit` (dev) | Generar y aplicar migraciones. |
| `@electric-sql/pglite` (dev) | Postgres real en memoria para testear la lógica de stock sin Neon. |
| `@types/node` (dev) | Tipos de `node:crypto` (firma HMAC y `timingSafeEqual`). |

El resto (`@sveltejs/*`, `svelte`, `vite`, `vitest`, `typescript`, `svelte-check`) viene del template de `sv create`.
