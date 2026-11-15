<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import isotipo from '#lib/assets/codeex-isotipo.png';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const enlaces = $derived([
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

	// Tema: por defecto sigue al sistema; el botón lo fija y se recuerda en este dispositivo (ver app.html).
	// Queda en null hasta que corre JS, para no mostrar un botón que no funciona.
	let oscuro = $state<boolean | null>(null);

	$effect(() => {
		const elegido = document.documentElement.dataset.tema;
		oscuro = elegido ? elegido === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function cambiarTema() {
		oscuro = !oscuro;
		const tema = oscuro ? 'oscuro' : 'claro';
		document.documentElement.dataset.tema = tema;
		try {
			localStorage.setItem('tema', tema);
		} catch {
			// sin almacenamiento (modo privado): el cambio vale hasta recargar
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<aside class="sidebar">
		<a class="marca" href="/">
			<img src={isotipo} alt="" width="44" height="39" />
			<span>Stock de EPP<small>Codeex Construcciones</small></span>
		</a>
		{#if data.admin}
			<a
				class="boton nueva-entrega"
				href="/nueva-entrega"
				aria-current={page.url.pathname === '/nueva-entrega' ? 'page' : undefined}>+ Nueva entrega</a
			>
		{/if}
		<nav aria-label="Secciones">
			{#each enlaces as e (e.href)}
				<a href={e.href} aria-current={page.url.pathname === e.href ? 'page' : undefined}>
					{e.texto}
					{#if e.href === '/' && data.aReponer > 0}
						<span class="cuenta" title="Artículos a reponer">{data.aReponer}<span class="oculto"> a reponer</span></span>
					{/if}
				</a>
			{/each}
		</nav>
		<div class="sesion">
			{#if instalacion}
				<button onclick={instalar}>Instalar app</button>
			{/if}
			{#if oscuro !== null}
				<button class="secundario" onclick={cambiarTema}>{oscuro ? 'Modo claro' : 'Modo oscuro'}</button>
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
