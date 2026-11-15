<script lang="ts">
	import { enhance } from '$app/forms';
	import Aviso from '#lib/Aviso.svelte';
	import { formatearFecha } from '#lib/fechas.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Movimientos · Stock de EPP</title>
</svelte:head>

<main>
	<div class="titulo-con-accion">
		<h1>Movimientos</h1>
		<a href="/movimientos.csv" download>Exportar CSV</a>
	</div>
	<Aviso resultado={form} />
	{#if data.movimientos.length === 0}
		<p class="tenue">Todavía no hay movimientos.</p>
	{:else}
		<table>
			<thead>
				<tr><th>Fecha</th><th>Tipo</th><th>Artículo</th><th class="num">Cant.</th><th>Empleado</th><th>Observaciones</th><th><span class="oculto">Acciones</span></th></tr>
			</thead>
			<tbody>
				{#each data.movimientos as m (m.id)}
					<tr>
						<td data-label="Fecha">{formatearFecha(m.fecha)}</td>
						<td data-label="Tipo"><span class="etiqueta {m.tipo}">{m.tipo === 'ingreso' ? 'Ingreso' : 'Entrega'}</span></td>
						<td data-label="Artículo">{m.articulo}</td>
						<td data-label="Cantidad" class="num">{m.tipo === 'ingreso' ? '+' : '−'}{m.cantidad}</td>
						<td data-label="Empleado">{m.empleado ?? ''}</td>
						<td data-label="Obs.">{m.observaciones ?? ''}</td>
						<td class="acciones">
							<details>
								<summary class="peligro">Borrar</summary>
								<form method="POST" action="?/borrarMovimiento" use:enhance class="confirmacion">
									<input type="hidden" name="id" value={m.id} />
									<p>¿Borrar este {m.tipo}? El stock se va a {m.tipo === 'ingreso' ? 'restar' : 'devolver'}.</p>
									<button class="peligro">Sí, borrar</button>
								</form>
							</details>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</main>
