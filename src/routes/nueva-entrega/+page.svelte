<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import Aviso from '#lib/Aviso.svelte';
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

	const elegidos = $derived(new Set(filas.map((f) => f.articuloId)));
	const stockDe = (articuloId: string) => data.articulos.find((a) => String(a.id) === articuloId)?.stock;

	const alEnviar: SubmitFunction = () => async ({ result, update }) => {
		await update();
		if (result.type === 'success') filas = [filaVacia()];
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
				Empleado (legajo - nombre)
				<input
					name="empleado"
					list="lista-empleados"
					placeholder="123 - Juan Pérez"
					autocomplete="off"
					required
					value={form?.valores?.empleado ?? ''}
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
				<div class="renglon">
					<select name="articuloId" aria-label="Artículo {i + 1}" required bind:value={fila.articuloId}>
						<option value="">Elegí…</option>
						{#each data.articulos as a (a.id)}
							{@const id = String(a.id)}
							<option value={id} disabled={a.stock === 0 || (elegidos.has(id) && fila.articuloId !== id)}>
								{a.nombre} (stock {a.stock})
							</option>
						{/each}
					</select>
					<input
						name="cantidad"
						type="number"
						min="1"
						max={stockDe(fila.articuloId)}
						step="1"
						inputmode="numeric"
						aria-label="Cantidad del artículo {i + 1}"
						required
						bind:value={fila.cantidad}
					/>
					{#if filas.length > 1}
						<button
							type="button"
							class="secundario"
							aria-label="Quitar artículo {i + 1}"
							onclick={() => (filas = filas.filter((f) => f !== fila))}
						>
							✕
						</button>
					{/if}
				</div>
			{/each}
			<button type="button" class="secundario" onclick={() => filas.push(filaVacia())}>+ Agregar artículo</button>
		</fieldset>

		<label>
			Observaciones (opcional)
			<input name="observaciones" maxlength="500" value={form?.valores?.observaciones ?? ''} />
		</label>
		<button type="submit">Registrar entrega</button>
		<Aviso resultado={form} />
	</form>
</main>
