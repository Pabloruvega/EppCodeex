<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { formatearFecha } from '#lib/fechas.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Arranca con ?q= (funciona sin JS); con JS filtra mientras se escribe.
	// svelte-ignore state_referenced_locally
	let busqueda = $state(data.q);

	const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
	const empleadosFiltrados = $derived(
		data.empleados.filter((e) => normalizar(e.empleado).includes(normalizar(busqueda.trim())))
	);

	/** Valores enviados en el último formulario fallido, para no perder lo escrito. */
	const valores = $derived<Record<string, string>>(form && 'valores' in form ? (form.valores ?? {}) : {});

	// En las filas editables no reseteamos el formulario: los valores nuevos llegan con los datos.
	const sinReset: SubmitFunction = () => async ({ update }) => update({ reset: false });

	const aviso = (...acciones: string[]) => (form && acciones.includes(form.accion) ? form : null);
</script>

<svelte:head>
	<title>Stock de EPP</title>
</svelte:head>

{#snippet mensaje(f: ReturnType<typeof aviso>)}
	{#if f && 'error' in f}
		<p class="error" role="alert">{f.error}</p>
	{:else if f && 'mensaje' in f}
		<p class="ok" role="status">{f.mensaje}</p>
	{/if}
{/snippet}

<header>
	<h1>Stock de EPP</h1>
	{#if data.admin}
		<form method="POST" action="/logout">
			<button class="secundario">Cerrar sesión</button>
		</form>
	{:else}
		<a href="/login">Ingresar</a>
	{/if}
</header>

<main>
	{#if data.admin}
		<section>
			<h2>Nueva entrega</h2>
			<form method="POST" action="?/entrega" use:enhance class="tarjeta grilla-entrega">
				<label class="ancho">
					Empleado (legajo - nombre)
					<input
						name="empleado"
						list="lista-empleados"
						placeholder="123 - Juan Pérez"
						autocomplete="off"
						required
						value={valores.empleado ?? ''}
					/>
				</label>
				<datalist id="lista-empleados">
					{#each data.nombresEmpleados as nombre (nombre)}<option value={nombre}></option>{/each}
				</datalist>
				<label class="ancho">
					Artículo
					<select name="articuloId" required>
						<option value="">Elegí…</option>
						{#each data.articulos as a (a.id)}
							<option value={a.id} selected={valores.articuloId === String(a.id)}>{a.nombre} (stock {a.stock})</option>
						{/each}
					</select>
				</label>
				<label>
					Cantidad
					<input name="cantidad" type="number" min="1" step="1" inputmode="numeric" required value={valores.cantidad ?? '1'} />
				</label>
				<label>
					Fecha
					<input name="fecha" type="date" required value={valores.fecha ?? data.hoy} />
				</label>
				<label class="ancho">
					Observaciones (opcional)
					<input name="observaciones" maxlength="500" value={valores.observaciones ?? ''} />
				</label>
				<button type="submit" class="ancho">Registrar entrega</button>
				<div class="ancho">{@render mensaje(aviso('entrega'))}</div>
			</form>
		</section>
	{/if}

	<section>
		<h2>Stock</h2>
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
							<td data-label="Estado"><span class={reponer ? 'etiqueta reponer' : 'etiqueta ok'}>{reponer ? 'Reponer' : 'OK'}</span></td>
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
		{@render mensaje(aviso('editarArticulo', 'ingreso', 'borrarArticulo'))}

		{#if data.admin}
			<details class="tarjeta">
				<summary>Nuevo artículo</summary>
				<form method="POST" action="?/crearArticulo" use:enhance class="en-linea">
					<label>Nombre <input name="nombre" maxlength="100" required value={valores.nombre ?? ''} /></label>
					<label>Stock inicial <input name="stock" type="number" min="0" step="1" inputmode="numeric" required value={valores.stock ?? '0'} /></label>
					<label>Mínimo <input name="stockMinimo" type="number" min="0" step="1" inputmode="numeric" placeholder="0" value={valores.stockMinimo ?? ''} /></label>
					<button>Crear</button>
				</form>
				{@render mensaje(aviso('crearArticulo'))}
			</details>
		{/if}
	</section>

	<section>
		<h2>Entregas por empleado</h2>
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
	</section>

	{#if data.admin}
		<section>
			<div class="titulo-con-accion">
				<h2>Movimientos</h2>
				<a href="/movimientos.csv" download>Exportar CSV</a>
			</div>
			{@render mensaje(aviso('borrarMovimiento'))}
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
		</section>
	{/if}
</main>
