<script>
	import "../app.css";
	import Panel from "$lib/components/Navbar.svelte";

	let { children } = $props();
</script>

<div class="flex flex-col h-full min-h-screen flex-grow">
	<Panel />

	<div class="grid grid-rows-1 grid-cols-1 h-full flex-grow">
		{@render children()}
	</div>
</div>
