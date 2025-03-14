<script lang="ts">
	import Icon from "@iconify/svelte";
	import {
		currentTool,
		currentToolSize,
		tools,
		type Tool,
	} from "$lib/stores";
	import { onMount } from "svelte";

	let toolContainer: HTMLDivElement;

	function selectTool(event: Event) {
		const element = event.currentTarget as HTMLButtonElement;
		const tool = element.getAttribute("aria-label") as Tool;
		currentTool.set(tool);

		document
			.querySelectorAll(".selected")
			.forEach((el) => el.classList.remove("selected"));
		element.classList.add("selected");
		console.log(`Tool selected: ${tool}`);
	}

	function validateInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.value && parseInt(input.value) < 1) input.value = "1";
	}

	function finishInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = parseInt(input.value) || 1;
		currentToolSize.set(value);
	}

	onMount(() => {
		// select first tool
		toolContainer.querySelector("button")?.classList.add("selected");
	});
</script>

<div class="panel flex flex-col items-center gap-4" bind:this={toolContainer}>
	{#each tools as tool}
		{@const icon =
			tool === "line"
				? "pepicons-pop:line-x"
				: tool === "picker"
					? "pepicons-pop:color-picker"
					: `mdi:${tool}`}
		<button
			class="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center hoverable"
			onclick={selectTool}
			aria-label={tool}
		>
			<Icon {icon} class="text-primary w-3/4 h-3/4" />
		</button>
	{/each}
	<div class="flex items-center flex-col gap-2">
		<label for="tool-size" class="text-sm text-secondary">Size:</label>
		<input
			type="number"
			id="tool-size"
			class="w-10 h-8"
			placeholder="1"
			min="1"
			oninput={validateInput}
			onchange={finishInput}
		/>
	</div>
</div>
