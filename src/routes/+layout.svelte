<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const enlaces = $derived([
		...(data.admin ? [{ href: '/nueva-entrega', texto: 'Nueva entrega' }] : []),
		{ href: '/', texto: 'Stock' },
		{ href: '/entregas', texto: 'Entregas por empleado' },
		...(data.admin ? [{ href: '/movimientos', texto: 'Movimientos' }] : [])
	]);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<aside class="sidebar">
		<a class="marca" href="/">Stock de EPP</a>
		<nav aria-label="Secciones">
			{#each enlaces as e (e.href)}
				<a href={e.href} aria-current={page.url.pathname === e.href ? 'page' : undefined}>{e.texto}</a>
			{/each}
		</nav>
		<div class="sesion">
			{#if data.admin}
				<form method="POST" action="/logout">
					<button class="secundario">Cerrar sesión</button>
				</form>
			{:else}
				<a href="/login">Ingresar</a>
			{/if}
		</div>
	</aside>

	<div class="contenido">
		{@render children()}
	</div>
</div>
