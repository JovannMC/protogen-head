<script lang="ts">
	import Matrix from "$lib/components/Matrix.svelte";
	import * as Panel from "$lib/components/panels";

	import { panels, columns, rows } from "$lib/stores";

	$effect(() => {
		console.log(`Panels: ${$panels}, Cols: ${$columns}, Rows: ${$rows}`);
	});
</script>

<div class="flex w-full h-full">
	<div class="w-16 h-full pb-13 p-1 fixed left-0">
		<Panel.Tool />
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex-1 flex items-center flex-wrap justify-center pb-24">
			{#each Array($panels) as _, index}
				<div class="bg-primary p-2 rounded-lg m-2">
					<Matrix />
				</div>
			{/each}
		</div>

		<div class="w-auto h-24 p-1 fixed bottom-0 left-15 right-15">
			<Panel.Animation />
		</div>
	</div>

	<div class="w-16 h-full pb-13 p-1 fixed right-0">
		<Panel.Color />
	</div>
</div>
