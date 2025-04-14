<script lang="ts">
	import Matrix from "$lib/components/Matrix.svelte";
	import * as Panel from "$lib/components/panels";

	import { panels, columns, rows, matrix, currentFrame } from "$lib/stores";
	import {
		undo,
		redo,
		initHistory,
		limitHistorySize,
		copy,
		paste,
	} from "$lib/utils/history";
	import { onMount } from "svelte";

	$effect(() => {
		console.log(`Panels: ${$panels}, cols: ${$columns}, rows: ${$rows}`);
	});

	onMount(() => {
		const keyState = {
			ctrlZ: false,
			ctrlY: false,
			ctrlC: false,
			ctrlV: false,
		};

		document.addEventListener("keydown", (event) => {
			if (event.ctrlKey && event.key === "z" && !keyState.ctrlZ) {
				keyState.ctrlZ = true;
				undo();
			} else if (event.ctrlKey && event.key === "y" && !keyState.ctrlY) {
				keyState.ctrlY = true;
				redo();
			} else if (event.ctrlKey && event.key === "c" && !keyState.ctrlC) {
				keyState.ctrlC = true;
				copy();
			} else if (event.ctrlKey && event.key === "v" && !keyState.ctrlV) {
				keyState.ctrlV = true;
				paste();
			}
		});

		document.addEventListener("keyup", (event) => {
			if (event.key === "z") keyState.ctrlZ = false;
			if (event.key === "y") keyState.ctrlY = false;
			if (event.key === "c") keyState.ctrlC = false;
			if (event.key === "v") keyState.ctrlV = false;
			if (!event.ctrlKey) {
				keyState.ctrlZ = false;
				keyState.ctrlY = false;
				keyState.ctrlC = false;
				keyState.ctrlV = false;
			}
		});

		initHistory();
		limitHistorySize(100);

		if ($matrix && $matrix.length > 0) {
			$matrix.forEach((panelData, index) => {
				const frameData = panelData[$currentFrame] || panelData[0];
				console.log(
					`Reloading panel ${index} from matrix store, frame ${$currentFrame}`,
				);
				document.getElementById(`panel-${index}`)?.dispatchEvent(
					new CustomEvent("update-matrix", {
						detail: {
							panelData: frameData,
						},
					}),
				);
			});
		}
	});
</script>

<div class="flex w-full h-full">
	<div class="w-16 h-full pb-13 p-1 fixed left-0">
		<Panel.Tool />
	</div>

	<div class="flex-1 flex flex-col">
		<div class="flex-1 flex items-center flex-wrap justify-center pb-24">
			{#each Array($panels) as _, index}
				<div class="bg-tertiary p-2 rounded-lg m-2">
					<Matrix {index} />
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
