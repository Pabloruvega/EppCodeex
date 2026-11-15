<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import Aviso from '#lib/Aviso.svelte';
	import { barraStock, estadoStock, ordenarPorUrgencia, TEXTO_ESTADO } from '#lib/estado-stock.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Valores enviados en el último formulario fallido, para no perder lo escrito. */
	const valores = $derived<Record<string, string>>(form && 'valores' in form ? (form.valores ?? {}) : {});

	const articulos = $derived(ordenarPorUrgencia(data.articulos));

	// "Guardar" aparece sólo en las filas que se editaron. Sin JS no se puede saber, así que se ve siempre.
	let conJs = $state(false);
	$effect(() => {
		conJs = true;
	});
	const editados = new SvelteSet<number>();

	// En las filas editables no reseteamos el formulario: los valores nuevos llegan con los datos.
	const guardar =
		(id: number): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') editados.delete(id);
		};

	const aviso = (...acciones: string[]) => (form && acciones.includes(form.accion) ? form : null);
</script>

<svelte:head>
	<title>Stock de EPP</title>
</svelte:head>

<main>
	<h1>Stock</h1>
	{#if data.articulos.length === 0}
		<p class="tenue">Todavía no hay artículos cargados.</p>
	{:else}
		<table class="tabla-stock">
			<thead>
				<tr>
					<th>Artículo</th>
					<th class="num">Stock</th>
					<th class="num">Mínimo</th>
					<th>Estado</th>
					{#if data.admin}<th><span class="oculto">Acciones</span></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each articulos as a (a.id)}
					{@const estado = estadoStock(a.stock, a.stockMinimo)}
					{@const barra = barraStock(a.stock, a.stockMinimo)}
					<tr>
						<td data-label="Artículo" class:articulo-urgente={estado !== 'ok'}>{a.nombre}</td>
						<td data-label="Stock" class="num">
							<div class="cantidad">
								{#if data.admin}
									<input
										class="celda"
										form="editar-{a.id}"
										name="stock"
										type="number"
										min="0"
										step="1"
										inputmode="numeric"
										value={a.stock}
										aria-label="Stock de {a.nombre}"
										required
										oninput={() => editados.add(a.id)}
									/>
								{:else}
									{a.stock}
								{/if}
								<!-- La barra compara el stock con el mínimo (la marca vertical); el estado ya lo dice en texto. -->
								<span class="barra {estado}" aria-hidden="true">
									<span class="relleno" style:width="{barra.relleno * 100}%"></span>
									{#if barra.marca !== null}<span class="marca-minimo" style:left="{barra.marca * 100}%"></span>{/if}
								</span>
							</div>
						</td>
						<td data-label="Mínimo" class="num">
							{#if data.admin}
								<input
									class="celda"
									form="editar-{a.id}"
									name="stockMinimo"
									type="number"
									min="0"
									step="1"
									inputmode="numeric"
									value={a.stockMinimo}
									aria-label="Mínimo de {a.nombre}"
									required
									oninput={() => editados.add(a.id)}
								/>
							{:else}
								{a.stockMinimo}
							{/if}
						</td>
						<td data-label="Estado"><span class="etiqueta {estado}">{TEXTO_ESTADO[estado]}</span></td>
						{#if data.admin}
							<td class="acciones">
								<form
									id="editar-{a.id}"
									method="POST"
									action="?/editarArticulo"
									use:enhance={guardar(a.id)}
									class:sin-cambios={conJs && !editados.has(a.id)}
								>
									<input type="hidden" name="id" value={a.id} />
									<button>Guardar</button>
								</form>
								<details>
									<summary class="accion">+ Ingreso</summary>
									<form method="POST" action="?/ingreso" use:enhance class="en-linea">
										<input type="hidden" name="articuloId" value={a.id} />
										<input name="cantidad" type="number" min="1" step="1" inputmode="numeric" placeholder="Cantidad" aria-label="Cantidad a ingresar de {a.nombre}" required />
										<button>Sumar</button>
									</form>
								</details>
								<details>
									<summary class="accion mas" aria-label="Más acciones para {a.nombre}" title="Más acciones">⋯</summary>
									<form method="POST" action="?/borrarArticulo" use:enhance class="confirmacion">
										<input type="hidden" name="id" value={a.id} />
										<p>
											¿Eliminar "{a.nombre}"?
											{#if a.movimientos > 0}Se borrarán también sus {a.movimientos} movimientos.{/if}
										</p>
										<button class="peligro">Sí, eliminar</button>
									</form>
								</details>
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	<Aviso resultado={aviso('editarArticulo', 'ingreso', 'borrarArticulo')} />

	{#if data.admin}
		<details class="tarjeta">
			<summary>Nuevo artículo</summary>
			<form method="POST" action="?/crearArticulo" use:enhance class="en-linea">
				<label>Nombre <input name="nombre" maxlength="100" required value={valores.nombre ?? ''} /></label>
				<label>Stock inicial <input name="stock" type="number" min="0" step="1" inputmode="numeric" required value={valores.stock ?? '0'} /></label>
				<label>Mínimo <input name="stockMinimo" type="number" min="0" step="1" inputmode="numeric" placeholder="0" value={valores.stockMinimo ?? ''} /></label>
				<button>Crear</button>
			</form>
			<Aviso resultado={aviso('crearArticulo')} />
		</details>
	{/if}
</main>
