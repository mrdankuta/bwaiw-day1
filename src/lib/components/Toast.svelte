<script lang="ts">
	let { toast }: { toast: string } = $props();
</script>

<div class="toast" class:show={toast !== ''} role="status" aria-live="polite">{toast}</div>
