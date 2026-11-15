<script lang="ts">
	import { formatearFecha } from '#lib/fechas.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Arranca con ?q= (funciona sin JS); con JS filtra mientras se escribe.
	// svelte-ignore state_referenced_locally
	let busqueda = $state(data.q);

	const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
	const empleadosFiltrados = $derived(
		data.empleados.filter((e) => normalizar(e.empleado).includes(normalizar(busqueda.trim())))
	);
</script>

<svelte:head>
	<title>Entregas por empleado · Stock de EPP</title>
</svelte:head>

<main>
	<h1>Entregas por empleado</h1>
	<form method="GET" class="en-linea" role="search">
		<input
			type="search"
			name="q"
			placeholder="Buscar por nombre o legajo"
			aria-label="Buscar empleado"
			bind:value={busqueda}
		/>
		<button class="secundario">Buscar</button>
	</form>

	{#each empleadosFiltrados as e (e.empleado)}
		<details class="empleado">
			<summary>
				<strong>{e.empleado}</strong>
				<span class="tenue">{e.totales.map((t) => `${t.articulo}: ${t.cantidad}`).join(' · ')}</span>
			</summary>
			<table>
				<thead><tr><th>Fecha</th><th>Artículo</th><th class="num">Cant.</th><th>Observaciones</th></tr></thead>
				<tbody>
					{#each e.detalle as d (d.id)}
						<tr>
							<td data-label="Fecha">{formatearFecha(d.fecha)}</td>
							<td data-label="Artículo">{d.articulo}</td>
							<td data-label="Cantidad" class="num">{d.cantidad}</td>
							<td data-label="Obs.">{d.observaciones ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	{:else}
		<p class="tenue">{busqueda ? 'No hay entregas para esa búsqueda.' : 'Todavía no hay entregas.'}</p>
	{/each}
</main>
