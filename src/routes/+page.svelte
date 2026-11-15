<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Aviso from '#lib/Aviso.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Valores enviados en el último formulario fallido, para no perder lo escrito. */
	const valores = $derived<Record<string, string>>(form && 'valores' in form ? (form.valores ?? {}) : {});

	// En las filas editables no reseteamos el formulario: los valores nuevos llegan con los datos.
	const sinReset: SubmitFunction = () => async ({ update }) => update({ reset: false });

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
				{#each data.articulos as a (a.id)}
					{@const reponer = a.stock <= a.stockMinimo}
					<tr>
						<td data-label="Artículo">{a.nombre}</td>
						{#if data.admin}
							<td data-label="Stock" class="num">
								<input form="editar-{a.id}" name="stock" type="number" min="0" step="1" inputmode="numeric" value={a.stock} aria-label="Stock de {a.nombre}" required />
							</td>
							<td data-label="Mínimo" class="num">
								<input form="editar-{a.id}" name="stockMinimo" type="number" min="0" step="1" inputmode="numeric" value={a.stockMinimo} aria-label="Mínimo de {a.nombre}" required />
							</td>
						{:else}
							<td data-label="Stock" class="num">{a.stock}</td>
							<td data-label="Mínimo" class="num">{a.stockMinimo}</td>
						{/if}
						<td data-label="Estado">
							{#if a.stock === 0}<span class="etiqueta sin-stock">Sin stock</span>
							{:else if reponer}<span class="etiqueta reponer">Reponer</span>
							{:else}<span class="etiqueta ok">OK</span>{/if}
						</td>
						{#if data.admin}
							<td class="acciones">
								<form id="editar-{a.id}" method="POST" action="?/editarArticulo" use:enhance={sinReset}>
									<input type="hidden" name="id" value={a.id} />
									<button class="secundario">Guardar</button>
								</form>
								<details>
									<summary>+ Ingreso</summary>
									<form method="POST" action="?/ingreso" use:enhance class="en-linea">
										<input type="hidden" name="articuloId" value={a.id} />
										<input name="cantidad" type="number" min="1" step="1" inputmode="numeric" placeholder="Cantidad" aria-label="Cantidad a ingresar de {a.nombre}" required />
										<button>Sumar</button>
									</form>
								</details>
								<details>
									<summary class="peligro">Eliminar</summary>
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
