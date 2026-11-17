<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import Aviso from '#lib/Aviso.svelte';
	import {
		agruparPorCategoria,
		categoriasDe,
		estadoStock,
		filtrarStock,
		resumenStock,
		SIN_CATEGORIA,
		TEXTO_ESTADO,
		type FiltroStock
	} from '#lib/estado-stock.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Valores enviados en el último formulario fallido, para no perder lo escrito. */
	const valores = $derived<Record<string, string>>(form && 'valores' in form ? (form.valores ?? {}) : {});

	const resumen = $derived(resumenStock(data.articulos));

	// Arranca con ?q= (funciona sin JS); con JS filtra mientras se escribe.
	// svelte-ignore state_referenced_locally
	let busqueda = $state(data.q);

	const articulos = $derived(filtrarStock(data.articulos, busqueda, data.filtro, data.categoria));
	const grupos = $derived(agruparPorCategoria(articulos));
	const categorias = $derived(categoriasDe(data.articulos));
	/** Para autocompletar al escribir una categoría: las que ya existen. */
	const categoriasConNombre = $derived(categorias.filter((c) => c !== SIN_CATEGORIA));
	const columnas = $derived(data.admin ? 5 : 4);

	const filtros: { valor: FiltroStock; texto: string }[] = [
		{ valor: 'todos', texto: 'Todos' },
		{ valor: 'reponer', texto: 'A reponer' },
		{ valor: 'sin-stock', texto: 'Sin stock' }
	];

	/** Enlace a un filtro conservando lo que se está buscando y la categoría elegida. */
	const hrefFiltro = (filtro: FiltroStock) => {
		const p = new URLSearchParams();
		if (busqueda.trim()) p.set('q', busqueda.trim());
		if (filtro !== 'todos') p.set('estado', filtro);
		if (data.categoria) p.set('categoria', data.categoria);
		return `?${p}`;
	};

	/** Búsqueda y filtro actuales, para que las exportaciones bajen lo mismo que se ve. */
	const consulta = $derived(hrefFiltro(data.filtro));

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
	<div class="titulo-con-accion">
		<h1>Stock</h1>
		{#if data.articulos.length > 0}
			<!-- Exporta lo que se ve: misma búsqueda y mismo filtro -->
			<p class="exportar">
				Exportar:
				<a href="/stock.xlsx{consulta}" download>Excel</a>
				<a href="/stock.pdf{consulta}" download>PDF</a>
				<a href="/stock.csv{consulta}" download>CSV</a>
			</p>
		{/if}
	</div>
	{#if data.articulos.length === 0}
		<p class="tenue">Todavía no hay artículos cargados.</p>
	{:else}
		<!-- Resumen: los números de alerta van en rojo sólo si hay algo que atender -->
		<dl class="resumen-stock">
			<div class="dato">
				<dt>Artículos</dt>
				<dd>{resumen.articulos}</dd>
			</div>
			<div class="dato" class:aviso={resumen.aReponer > 0}>
				<dt>A reponer</dt>
				<dd>{resumen.aReponer}</dd>
			</div>
			<div class="dato" class:aviso={resumen.sinStock > 0}>
				<dt>Sin stock</dt>
				<dd>{resumen.sinStock}</dd>
			</div>
		</dl>

		<div class="filtros-stock">
			<form method="GET" class="buscar" role="search">
				<input type="search" name="q" placeholder="Buscar artículo" aria-label="Buscar artículo" bind:value={busqueda} />
				{#if data.filtro !== 'todos'}<input type="hidden" name="estado" value={data.filtro} />{/if}
				{#if categorias.length > 1 || data.categoria}
					<!-- Con JS filtra al elegir; sin JS se aplica con "Buscar" -->
					<select
						name="categoria"
						aria-label="Filtrar por categoría"
						value={data.categoria}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						<option value="">Todas las categorías</option>
						{#each categorias as c (c)}<option value={c}>{c}</option>{/each}
					</select>
				{/if}
				<button class="secundario">Buscar</button>
			</form>
			<nav class="segmento" aria-label="Filtrar por estado">
				{#each filtros as f (f.valor)}
					<a
						href={hrefFiltro(f.valor)}
						aria-current={data.filtro === f.valor ? 'page' : undefined}
						data-sveltekit-noscroll
						data-sveltekit-replacestate
						data-sveltekit-keepfocus>{f.texto}</a
					>
				{/each}
			</nav>
		</div>
	{/if}

	{#if data.articulos.length > 0 && articulos.length === 0}
		<p class="tenue">Ningún artículo coincide con la búsqueda o el filtro.</p>
	{:else if articulos.length > 0}
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
			{#each grupos as g (g.categoria)}
			<tbody>
				<tr class="grupo">
					<th colspan={columnas} scope="colgroup">
						{g.categoria} <span class="tenue">· {g.articulos.length}</span>
					</th>
				</tr>
				{#each g.articulos as a (a.id)}
					{@const estado = estadoStock(a.stock, a.stockMinimo)}
					<tr>
						<td data-label="Artículo" class:articulo-urgente={estado !== 'ok'}>
							{#if data.admin}
								<input
									class="celda nombre"
									form="editar-{a.id}"
									name="nombre"
									maxlength="100"
									value={a.nombre}
									aria-label="Nombre de {a.nombre}"
									required
									oninput={() => editados.add(a.id)}
								/>
							{:else}
								{a.nombre}
							{/if}
						</td>
						<td data-label="Stock" class="num">
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
									<label class="cambiar-categoria">
										Categoría
										<input
											form="editar-{a.id}"
											name="categoria"
											list="lista-categorias"
											maxlength="50"
											placeholder={SIN_CATEGORIA}
											value={a.categoria ?? ''}
											oninput={() => editados.add(a.id)}
										/>
										<small class="tenue">Se aplica con "Guardar".</small>
									</label>
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
			{/each}
		</table>
	{/if}
	{#if data.admin}
		<datalist id="lista-categorias">
			{#each categoriasConNombre as c (c)}<option value={c}></option>{/each}
		</datalist>
	{/if}
	<Aviso resultado={aviso('editarArticulo', 'ingreso', 'borrarArticulo')} />

	{#if data.admin}
		<details class="tarjeta">
			<summary>Nuevo artículo</summary>
			<form method="POST" action="?/crearArticulo" use:enhance class="en-linea">
				<label>Nombre <input name="nombre" maxlength="100" required value={valores.nombre ?? ''} /></label>
				<label
					>Categoría <input
						name="categoria"
						list="lista-categorias"
						maxlength="50"
						placeholder={SIN_CATEGORIA}
						value={valores.categoria ?? (data.categoria === SIN_CATEGORIA ? '' : data.categoria)}
					/></label
				>
				<label>Stock inicial <input name="stock" type="number" min="0" step="1" inputmode="numeric" required value={valores.stock ?? '0'} /></label>
				<label>Mínimo <input name="stockMinimo" type="number" min="0" step="1" inputmode="numeric" placeholder="0" value={valores.stockMinimo ?? ''} /></label>
				<button>Crear</button>
			</form>
			<Aviso resultado={aviso('crearArticulo')} />
		</details>
	{/if}
</main>
