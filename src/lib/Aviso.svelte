<script lang="ts">
	/** Resultado de una action: muestra el error o el mensaje de éxito, si hay. */
	let { resultado }: { resultado: { error?: string; mensaje?: string } | null | undefined } = $props();
</script>

{#if resultado?.error}
	<p class="error" role="alert">{resultado.error}</p>
{:else if resultado?.mensaje}
	<p class="ok" role="status">{resultado.mensaje}</p>
{/if}
