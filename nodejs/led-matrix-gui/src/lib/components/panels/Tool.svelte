<script lang="ts">
	import Icon from "@iconify/svelte";
	import { currentTool, tools, type Tool } from "$lib/stores";
	import { onMount } from "svelte";

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

    onMount(() => {
        const firstTool = document.querySelector("button") as HTMLButtonElement;
        firstTool.classList.add("selected");
    });
</script>

<div class="panel flex flex-col items-center gap-4">
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
</div>

