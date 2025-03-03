<script lang="ts">
	import { columns, rows } from "$lib/stores";
</script>

<div
	class="grid gap-1"
	style="grid-template-columns: repeat({$columns}, minmax(0, 1fr)); grid-template-rows: repeat({$rows}, minmax(0, 1fr));"
>
	{#each Array($rows) as _, rowIndex}
		{#each Array($columns) as _, colIndex}
			<div class="w-1 h-1 bg-gray-200 border border-gray-300"></div>
		{/each}
	{/each}
</div>
