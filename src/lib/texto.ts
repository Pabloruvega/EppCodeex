/** Para buscar sin importar mayúsculas ni acentos: "Arnés" y "arnes" coinciden. */
export const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** true si `texto` contiene `busqueda`, ignorando mayúsculas, acentos y espacios en los extremos. */
export const coincide = (texto: string, busqueda: string) => normalizar(texto).includes(normalizar(busqueda.trim()));
