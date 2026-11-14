import { defineEnvVars } from '@sveltejs/kit/env';

function minimo(nombre: string, largo: number) {
	return (valor: string | undefined) => {
		if (!valor || valor.length < largo) throw new Error(`${nombre} tiene que tener al menos ${largo} caracteres`);
		return valor;
	};
}

// Todas privadas (por defecto): solo se pueden importar desde código de servidor.
export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Cadena de conexión de Neon (la inyecta la integración de Vercel)',
		schema: minimo('DATABASE_URL', 1)
	},
	ADMIN_PASSWORD: {
		description: 'Contraseña única del administrador',
		schema: minimo('ADMIN_PASSWORD', 8)
	},
	SESSION_SECRET: {
		description: 'Secreto para firmar la cookie de sesión (32+ caracteres aleatorios)',
		schema: minimo('SESSION_SECRET', 32)
	}
});
