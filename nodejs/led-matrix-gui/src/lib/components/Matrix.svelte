<script lang="ts">
    // TODO: implement selection logic
</script>

<div class="grid grid-cols-64 grid-rows-32 gap-1">
	{#each Array(32) as _, rowIndex}
		{#each Array(64) as _, colIndex}
			<div class="w-1 h-1 bg-gray-200 border border-gray-300"></div>
		{/each}
	{/each}
</div>
