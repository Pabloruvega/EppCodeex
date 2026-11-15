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

	// Chrome y Edge avisan cuando la app se puede instalar; guardamos el aviso para ofrecer el botón.
	// En iPhone no existe: se instala desde Compartir → "Agregar a inicio".
	type AvisoInstalacion = Event & { prompt(): Promise<unknown> };
	let instalacion = $state<AvisoInstalacion | null>(null);

	$effect(() => {
		const alOfrecer = (e: Event) => {
			e.preventDefault();
			instalacion = e as AvisoInstalacion;
		};
		const alInstalar = () => (instalacion = null);
		window.addEventListener('beforeinstallprompt', alOfrecer);
		window.addEventListener('appinstalled', alInstalar);
		return () => {
			window.removeEventListener('beforeinstallprompt', alOfrecer);
			window.removeEventListener('appinstalled', alInstalar);
		};
	});

	async function instalar() {
		await instalacion?.prompt();
		instalacion = null;
	}
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
			{#if instalacion}
				<button onclick={instalar}>Instalar app</button>
			{/if}
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
