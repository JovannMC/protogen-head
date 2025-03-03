<script lang="ts">
	import Icon from "@iconify/svelte";
</script>

<div class="w-full h-12 bg-primary shadow-md z-10">
	<div class="container mx-auto flex items-center justify-between h-full">
		<div class="flex items-center space-x-4">
			<a href="/" class="text-secondary font-bold text-lg">LED Matrix</a>
		</div>
		<div class="flex items-center justify-center">
			<a
				href="/settings"
				class="hover:rotate-180 transform transition-transform duration-300"
			>
				<Icon icon="mdi:settings" width={24} />
			</a>
		</div>
	</div>
</div>
