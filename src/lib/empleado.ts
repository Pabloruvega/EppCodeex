/** Separa "123 - Juan Pérez" en legajo y nombre; si no tiene ese formato, todo va al nombre. */
export function separarEmpleado(empleado: string): { legajo: string; nombre: string } {
	const m = empleado.trim().match(/^(\S+?)\s*-\s*(.+)$/);
	return m ? { legajo: m[1], nombre: m[2].trim() } : { legajo: '', nombre: empleado.trim() };
}
