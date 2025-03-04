<script lang="ts">
	import { columns, rows, currentColor } from "$lib/stores";

	let isDragging = false;

	function handlePixelClick(event: Event) {
		const pixel = event.target as HTMLButtonElement;
		let newColor = $currentColor;

		// TODO handle transparent better (add class/id probably)
		if ($currentColor === "transparent") {
			const computedStyle = getComputedStyle(document.documentElement);
			newColor = computedStyle.getPropertyValue("--bg-tertiary").trim();
		}

		pixel.style.backgroundColor = newColor;
	}

	function handleMouseDown(event: Event) {
		isDragging = true;
		if ((event.target as HTMLElement).classList.contains("led")) {
			handlePixelClick(event);
		}
	}

	function handleMouseMove(event: Event) {
		if (isDragging) handlePixelClick(event);
	}

	const handleMouseUp = () => (isDragging = false);
</script>

<div
	class="grid gap-1"
	style="grid-template-columns: repeat({$columns}, minmax(0, 1fr)); grid-template-rows: repeat({$rows}, minmax(0, 1fr));"
	onmouseup={handleMouseUp}
	onmousedown={handleMouseDown}
	onmouseleave={handleMouseUp}
	role="grid"
	tabindex="0"
	aria-label="LED Matrix"
	draggable={false}
>
	{#each Array($rows) as _, rowIndex}
		{#each Array($columns) as _, colIndex}
			<button
				class="led w-1 h-1 bg-tertiary"
				aria-label="LED"
				onmouseup={handleMouseUp}
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onkeypress={(e) => e.key === "Enter" && handlePixelClick(e)}
				draggable={false}
			></button>
		{/each}
	{/each}
</div>
