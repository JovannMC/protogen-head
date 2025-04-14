<script lang="ts">
	import {
		currentColor as colorStore,
		currentFrame,
		defaultColors,
		matrix,
		panels,
		selectedPanel,
	} from "$lib/stores";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";

	function handleColorChange(event: Event) {
		const color = (event.target as HTMLInputElement).id;
		const picker = document.getElementById("picker") as HTMLInputElement;

		console.log(`Color picked: ${color}`);
		if (color === "transparent") {
			picker.value = "#ffffff";
			picker.classList.add("checkered-bg");
		} else {
			picker.value = color;
			picker.classList.remove("checkered-bg");
		}

		colorStore.set(color);
	}

	function handlePickerChange(event: Event) {
		const color = (event.target as HTMLInputElement).value;
		console.log(`Picker color changed: ${color}`);
		colorStore.set(color);
	}

	function mirrorX() {
		matrix.update((matrices) => {
			const newMatrices = [...matrices];

			for (
				let panelIndex = 0;
				panelIndex < newMatrices.length;
				panelIndex++
			) {
				if (
					newMatrices[panelIndex] &&
					newMatrices[panelIndex][$currentFrame]
				) {
					const frameData = newMatrices[panelIndex][$currentFrame];

					for (let row = 0; row < frameData.length; row++) {
						frameData[row] = frameData[row].slice().reverse();
					}

					document
						.getElementById(`panel-${panelIndex}`)
						?.dispatchEvent(
							new CustomEvent("update-matrix", {
								detail: {
									panelData: frameData,
								},
							}),
						);
				}
			}

			return newMatrices;
		});

		console.log("Mirrored horizontally (X axis)");
	}

	function mirrorY() {
		matrix.update((matrices) => {
			const newMatrices = [...matrices];

			for (
				let panelIndex = 0;
				panelIndex < newMatrices.length;
				panelIndex++
			) {
				if (
					newMatrices[panelIndex] &&
					newMatrices[panelIndex][$currentFrame]
				) {
					const frameData = newMatrices[panelIndex][$currentFrame];

					newMatrices[panelIndex][$currentFrame] = frameData
						.slice()
						.reverse();

					document
						.getElementById(`panel-${panelIndex}`)
						?.dispatchEvent(
							new CustomEvent("update-matrix", {
								detail: {
									panelData:
										newMatrices[panelIndex][$currentFrame],
								},
							}),
						);
				}
			}

			return newMatrices;
		});

		console.log("Mirrored vertically (Y axis)");
	}

	function clearAll() {
		// reset all LEDs to black (0) in DOM
		Array.from(document.getElementsByClassName("led")).forEach((led) => {
			const color = "#000000";
			(led as HTMLElement).style.backgroundColor = color;
		});

		// reset all pixels of current frame to black (0)
		matrix.update((matrices) => {
			const newMatrices = [...matrices];

			for (
				let panelIndex = 0;
				panelIndex < newMatrices.length;
				panelIndex++
			) {
				if (
					newMatrices[panelIndex] &&
					newMatrices[panelIndex][$currentFrame]
				) {
					const frameData = newMatrices[panelIndex][$currentFrame];

					for (let row = 0; row < frameData.length; row++) {
						for (let col = 0; col < frameData[row].length; col++) {
							frameData[row][col] = 0;
						}
					}
				}
			}

			return newMatrices;
		});

		console.log("All pixels cleared");
	}

	onMount(() => {
		colorStore.subscribe((value) => {
			const picker = document.getElementById(
				"picker",
			) as HTMLInputElement;
			picker.value = value;
			if (value === "transparent") {
				picker.classList.add("checkered-bg");
			} else {
				picker.classList.remove("checkered-bg");
			}
		});
	});
</script>

<div class="panel">
	<div class="flex flex-col items-center gap-4">
		<input
			type="color"
			id="picker"
			class="w-10 h-11 hoverable p-[2px] rounded-lg bg-secondary"
			oninput={handlePickerChange}
		/>

		<div class="grid grid-cols-2 gap-2">
			{#each defaultColors as color}
				<button
					class="w-4 h-4 hoverable-lg {color === 'transparent'
						? 'checkered-bg'
						: ''}"
					id={color}
					style="background-color: {color};"
					onclick={handleColorChange}
					aria-label="Color {color}"
				></button>
			{/each}
		</div>

		<button
			class="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center hoverable"
			onclick={clearAll}
			aria-label="Clear all"
		>
			<Icon icon="bi:trash" class="text-red-400 w-3/4 h-3/4" />
		</button>

		<button
			class="flex-1 bg-secondary rounded-lg flex items-center justify-center hoverable p-1"
			onclick={mirrorX}
			aria-label="Mirror X"
		>
			<Icon icon="mdi:flip-horizontal" class="text-black" width="24" />
		</button>

		<button
			class="flex-1 bg-secondary rounded-lg flex items-center justify-center hoverable p-1"
			onclick={mirrorY}
			aria-label="Mirror Y"
		>
			<Icon icon="mdi:flip-vertical" class="text-black" width="24" />
		</button>

		<select
			class="w-full bg-secondary rounded p-1 text-xs text-white"
			bind:value={$selectedPanel}
		>
			<option value={-1}>All Panels</option>
			{#each Array($panels) as _, i}
				<option value={i}>Panel {i + 1}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.checkered-bg {
		background-image:
			linear-gradient(45deg, #000 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #000 75%),
			linear-gradient(45deg, transparent 75%, #000 75%),
			linear-gradient(45deg, #000 25%, #fff 25%);

		background-size: 10px 10px;

		background-position:
			0 0,
			0 0,
			-5px -5px,
			5px 5px;
	}
</style>
