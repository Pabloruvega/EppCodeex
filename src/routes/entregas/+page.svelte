<script lang="ts">
	import { formatearFecha } from '#lib/fechas.js';
	import { coincide } from '#lib/texto.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Arranca con ?q= (funciona sin JS); con JS filtra mientras se escribe.
	// svelte-ignore state_referenced_locally
	let busqueda = $state(data.q);

	const empleadosFiltrados = $derived(data.empleados.filter((e) => coincide(e.empleado, busqueda)));
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
			placeholder="Buscar por nombre"
			aria-label="Buscar empleado"
			bind:value={busqueda}
		/>
		<button class="secundario">Buscar</button>
	</form>

	{#each empleadosFiltrados as e (e.empleado)}
		<details class="empleado">
			<summary>
				<strong class="nombre">{e.empleado}</strong>
				<span class="ultima">Última entrega: {formatearFecha(e.ultima)}</span>
				<span class="totales">
					{#each e.totales as t (t.articulo)}
						<span class="chip">{t.articulo} <b>{t.cantidad}</b></span>
					{/each}
				</span>
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
