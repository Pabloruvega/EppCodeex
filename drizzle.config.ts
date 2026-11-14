import { defineConfig } from 'drizzle-kit';

// drizzle-kit corre fuera de SvelteKit: cargamos .env con la función nativa de Node (sin dotenv).
try {
	process.loadEnvFile('.env');
} catch {
	// sin .env: se usan las variables del entorno
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	// Para migrar conviene la conexión directa (sin PgBouncer) que también inyecta Neon.
	dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
	strict: true,
	verbose: true
});
