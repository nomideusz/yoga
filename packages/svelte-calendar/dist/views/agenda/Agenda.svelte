<script lang="ts">import AgendaDay from "./AgendaDay.svelte";
import AgendaWeek from "./AgendaWeek.svelte";
let { mode = "day", ...rest } = $props();
</script>

{#if mode === 'day'}
	<AgendaDay {...rest} />
{:else}
	<AgendaWeek {...rest} />
{/if}
