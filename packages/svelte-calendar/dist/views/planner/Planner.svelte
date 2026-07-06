<script lang="ts">import PlannerDay from "./PlannerDay.svelte";
import PlannerWeek from "./PlannerWeek.svelte";
let { mode = "week", ...rest } = $props();
</script>

{#if mode === 'day'}
	<PlannerDay {...rest} />
{:else}
	<PlannerWeek {...rest} />
{/if}
