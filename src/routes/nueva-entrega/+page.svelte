<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Aviso from '#lib/Aviso.svelte';
	import { agruparPorCategoria, categoriaDe, compararCategorias, despuesDeEntregar } from '#lib/estado-stock.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Un renglón por artículo a entregar. */
	type Fila = { clave: number; articuloId: string; cantidad: number | null };
	let siguienteClave = 0;
	const filaVacia = (): Fila => ({ clave: siguienteClave++, articuloId: '', cantidad: 1 });

	// Si la entrega falló sin JS, volvemos a mostrar los renglones enviados.
	// svelte-ignore state_referenced_locally
	let filas = $state<Fila[]>(
		form?.filas?.length
			? form.filas.map((f) => ({ clave: siguienteClave++, articuloId: f.articuloId, cantidad: Number(f.cantidad) || null }))
			: [filaVacia()]
	);

	// svelte-ignore state_referenced_locally
	let empleado = $state(form?.valores?.empleado ?? '');

	const elegidos = $derived(new Set(filas.map((f) => f.articuloId)));
	/** Artículos agrupados por categoría (orden alfabético dentro de cada una) para el desplegable. */
	const porCategoria = $derived(
		agruparPorCategoria(
			[...data.articulos].sort((x, y) => compararCategorias(categoriaDe(x), categoriaDe(y)) || x.nombre.localeCompare(y.nombre, 'es'))
		)
	);
	const articuloDe = (articuloId: string) => data.articulos.find((a) => String(a.id) === articuloId);

	/** Cómo queda el artículo del renglón después de la entrega; null mientras falte elegirlo o poner la cantidad. */
	const restoDe = (fila: Fila) => {
		const a = articuloDe(fila.articuloId);
		if (!a || !fila.cantidad || fila.cantidad < 1) return null;
		return despuesDeEntregar(a.stock, a.stockMinimo, fila.cantidad);
	};

	// Resumen de la barra de cierre: sólo cuenta renglones completos.
	const completas = $derived(filas.filter((f) => f.articuloId && f.cantidad && f.cantidad > 0));
	const unidades = $derived(completas.reduce((s, f) => s + (f.cantidad ?? 0), 0));
	const nombreEmpleado = $derived(empleado.trim());

	const alEnviar: SubmitFunction = () => async ({ result, update }) => {
		await update();
		if (result.type === 'success') {
			filas = [filaVacia()];
			empleado = '';
		}
	};
</script>

<svelte:head>
	<title>Nueva entrega · Stock de EPP</title>
</svelte:head>

<main>
	<h1>Nueva entrega</h1>
	<form method="POST" use:enhance={alEnviar} class="tarjeta pila">
		<div class="campos-entrega">
			<label>
				Empleado
				<input
					name="empleado"
					list="lista-empleados"
					placeholder="Juan Pérez"
					autocomplete="off"
					required
					bind:value={empleado}
				/>
			</label>
			<datalist id="lista-empleados">
				{#each data.nombresEmpleados as nombre (nombre)}<option value={nombre}></option>{/each}
			</datalist>
			<label>
				Fecha
				<input name="fecha" type="date" required value={form?.valores?.fecha ?? data.hoy} />
			</label>
		</div>

		<fieldset class="renglones">
			<legend>Artículos</legend>
			{#each filas as fila, i (fila.clave)}
				{@const resto = restoDe(fila)}
				<div class="renglon">
					<select name="articuloId" aria-label="Artículo {i + 1}" required bind:value={fila.articuloId}>
						<option value="">Elegí…</option>
						{#snippet opciones(articulos: typeof data.articulos)}
							{#each articulos as a (a.id)}
								{@const id = String(a.id)}
								<option value={id} disabled={a.stock === 0 || (elegidos.has(id) && fila.articuloId !== id)}>
									{a.nombre} (stock {a.stock})
								</option>
							{/each}
						{/snippet}
						<!-- Con una sola categoría (o ninguna cargada) no hace falta agrupar -->
						{#if porCategoria.length > 1}
							{#each porCategoria as g (g.categoria)}
								<optgroup label={g.categoria}>{@render opciones(g.articulos)}</optgroup>
							{/each}
						{:else}
							{@render opciones(porCategoria[0]?.articulos ?? [])}
						{/if}
					</select>
					<input
						name="cantidad"
						type="number"
						min="1"
						max={articuloDe(fila.articuloId)?.stock}
						step="1"
						inputmode="numeric"
						aria-label="Cantidad del artículo {i + 1}"
						required
						bind:value={fila.cantidad}
					/>
					<!-- Cuánto queda después de esta entrega; en rojo si queda en el mínimo o por debajo -->
					<span class="quedan" class:poco={resto?.bajoMinimo}>
						{#if resto}{resto.alcanza ? `quedan ${resto.quedan}` : `faltan ${-resto.quedan}`}{/if}
					</span>
					{#if filas.length > 1}
						<button
							type="button"
							class="discreto"
							aria-label="Quitar artículo {i + 1}"
							onclick={() => (filas = filas.filter((f) => f !== fila))}
						>
							✕
						</button>
					{/if}
				</div>
			{/each}
			<button type="button" class="discreto" onclick={() => filas.push(filaVacia())}>+ Agregar artículo</button>
		</fieldset>

		<label>
			Observaciones (opcional)
			<input name="observaciones" maxlength="500" value={form?.valores?.observaciones ?? ''} />
		</label>
		<Aviso resultado={form} />
		<div class="cierre">
			<p class="resumen">
				{#if completas.length > 0}
					<b>{completas.length}</b>
					{completas.length === 1 ? 'artículo' : 'artículos'} ·
					<b>{unidades}</b>
					{unidades === 1 ? 'unidad' : 'unidades'}{#if nombreEmpleado}&nbsp;para {nombreEmpleado}{/if}
				{/if}
			</p>
			<button type="submit">Registrar entrega</button>
		</div>
	</form>
</main>
