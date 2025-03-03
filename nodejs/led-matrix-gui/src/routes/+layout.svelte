<script>
	import "../app.css";
	import "@fontsource/inter/400.css";
	import "@fontsource/inter/500.css";
	import "@fontsource/inter/600.css";

	import Panel from "$lib/components/Navbar.svelte";

	let { children } = $props();
</script>

<div class="flex flex-col h-full min-h-screen flex-grow">
	<Panel />

	<div class="grid grid-rows-1 grid-cols-1 h-full flex-grow">
		{@render children()}
	</div>
</div>
