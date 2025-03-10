<script lang="ts">
	import { openPath } from "@tauri-apps/plugin-opener";

	const open = async (url: string) => await openPath(url);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_missing_attribute -->

<div class="flex flex-col items-center justify-center h-full p-4">
	<div
		class="bg-tertiary p-8 rounded-lg shadow-lg max-w-lg w-full flex flex-col gap-6"
	>
		<div class="container">
			<h1>About LED Matrix GUI</h1>
			<p>
				<a
					class="cursor-pointer text-blue-600 underline"
					onclick={() =>
						open(
							"https://github.com/JovannMC/protogen-head/tree/main/nodejs/led-matrix-gui",
						)}>LED Matrix GUI</a
				>
				is a powerful tool to easily visualize and create designs and (soon)
				animations. It is a part of the
				<a
					class="cursor-pointer text-blue-600 underline"
					onclick={() =>
						open("https://github.com/JovannMC/protogen-head")}
					>protogen-head</a
				>
				project monorepo that focuses on the code to control the LED matrices,
				interfacing with other devices & sensors for interactivity.
			</p>
		</div>
		<div class="container">
			<h2>Credits</h2>
			<p>
				Developed by: <a
					class="cursor-pointer text-blue-600 underline"
					onclick={() => open("https://jovann.me")}>JovannMC</a
				><br />
				Special thanks to:
				<a
					class="cursor-pointer text-blue-600 underline"
					onclick={() => open("https://github.com/Smeltie")}
					>Smeltie</a
				>,
				<a
					class="cursor-pointer text-blue-600 underline"
					onclick={() => open("https://github.com/TheDevMinerTV")}
					>Anna</a
				>, and
				<a
					class="cursor-pointer text-blue-600 underline"
					onclick={() => open("https://github.com/XB15")}>XB15</a
				> for help & inspiration for the project
			</p>
		</div>
		<div class="container">
			<h2>Tools used:</h2>
			<ul class="text-secondary list-none p-0">
				<li class="mb-2">
					<a
						class="cursor-pointer text-blue-600 underline"
						onclick={() => open("https://tauri.app")}>Tauri</a
					>
				</li>
				<li class="mb-2">
					<a
						class="cursor-pointer text-blue-600 underline"
						onclick={() => open("https://svelte.dev")}
						>Svelte(Kit)</a
					>
				</li>
				<li class="mb-2">
					<a
						class="cursor-pointer text-blue-600 underline"
						onclick={() => open("https://tailwindcss.com")}
						>Tailwind</a
					>
				</li>
				<li class="mb-2">
					<a
						class="cursor-pointer text-blue-600 underline"
						onclick={() => open("https://iconify.design")}
						>Iconify</a
					>
				</li>
			</ul>
		</div>
	</div>
</div>

<style>
	@reference "../../app.css";

	h1 {
		@apply text-primary text-3xl text-center font-bold;
	}

	p {
		@apply text-primary text-center;
	}

	h2 {
		@apply text-primary text-2xl text-center font-bold;
	}

	ul {
		@apply list-none text-center;
	}

	li {
		@apply mb-1 text-center;
	}

	a {
		@apply text-blue-600 underline cursor-pointer;
	}

	.container {
		@apply flex flex-col items-center justify-center gap-2;
	}
</style>
