<script lang="ts">
	import Matrix from "$lib/components/Matrix.svelte";
	import * as Panel from "$lib/components/panels";

	import { panels, columns, rows } from "$lib/stores";

	$effect(() => {
		console.log(`Panels: ${$panels}, Cols: ${$columns}, Rows: ${$rows}`);
	});
</script>

<div class="flex w-full h-full">
	<div class="w-16 h-full p-1">
		<Panel.Tool />
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex-1 flex items-center flex-wrap justify-center">
			{#each Array($panels) as _, index}
				<div class="bg-primary p-2 rounded-lg m-2">
					<Matrix />
				</div>
			{/each}
		</div>

		<div class="w-full h-24 p-1">
			<Panel.Animation />
		</div>
	</div>

	<div class="w-16 h-full p-1">
		<Panel.Color />
	</div>
</div>
