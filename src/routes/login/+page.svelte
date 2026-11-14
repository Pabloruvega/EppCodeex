<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Ingresar · Stock de EPP</title>
</svelte:head>

<main class="angosto">
	<h1>Ingresar como administrador</h1>
	<form method="POST" class="tarjeta pila">
		<label>
			Contraseña
			<input type="password" name="password" autocomplete="current-password" required />
		</label>
		{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
		<button type="submit">Ingresar</button>
	</form>
	<p><a href="/">← Volver al stock</a></p>
</main>
