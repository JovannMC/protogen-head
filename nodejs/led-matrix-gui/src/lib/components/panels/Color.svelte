<script lang="ts">
	import { color as colorStore } from "$lib/stores";

	const colors = [
		"#FF0000",
		"#00FF00",
		"#0000FF",
		"#FFFF00",
		"#FF00FF",
		"#00FFFF",
		"#000000",
		"#FFFFFF",
		"transparent",
	];

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
</script>

<div class="panel">
	<div class="flex flex-col items-center gap-4">
		<input
			type="color"
			id="picker"
			class="w-8 h-9"
			oninput={handlePickerChange}
		/>
		<div class="grid grid-cols-2 gap-2">
			{#each colors as color}
				<button
					class="w-4 h-4 {color === 'transparent'
						? 'checkered-bg'
						: ''}"
					id={color}
					style="background-color: {color};"
					onclick={handleColorChange}
					aria-label="Color {color}"
				></button>
			{/each}
		</div>
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
