<script lang="ts">import MobileDay from "./MobileDay.svelte";
import MobileWeek from "./MobileWeek.svelte";
let { mode = "day", ...rest } = $props();
</script>

{#if mode === 'day'}
	<MobileDay {...rest} />
{:else}
	<MobileWeek {...rest} />
{/if}
