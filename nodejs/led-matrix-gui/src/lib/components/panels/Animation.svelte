<script lang="ts">
	import Icon from "@iconify/svelte";
	import { currentFrame, selectedFPS } from "$lib/stores";
	import { onMount } from "svelte";

	let isPlaying = false;
	let isLooping = true;
	let keyframes: number[] = [0, 30, 60];
	let totalFrames = 120;
	let animationInterval: ReturnType<typeof setInterval>;

	function addKeyframe() {
		const newFrame = $currentFrame;
		if (!keyframes.includes(newFrame)) {
			keyframes = [...keyframes, newFrame].sort((a, b) => a - b);
			console.log(`Added keyframe at frame ${newFrame}`);
		}
	}

	function deleteKeyframe() {
		if (keyframes.length > 1 && keyframes.includes($currentFrame)) {
			keyframes = keyframes.filter((frame) => frame !== $currentFrame);
			const nearestKeyframe = keyframes.reduce((prev, curr) =>
				Math.abs(curr - $currentFrame) < Math.abs(prev - $currentFrame)
					? curr
					: prev,
			);
			$currentFrame = nearestKeyframe;
			console.log(
				`Deleted keyframe at frame ${$currentFrame}, moved to ${nearestKeyframe}`,
			);
		}
	}

	function togglePlay() {
		isPlaying = !isPlaying;

		if (isPlaying) {
			animationInterval = setInterval(() => {
				$currentFrame++;
				if ($currentFrame >= totalFrames) {
					if (isLooping) $currentFrame = 0;
					else {
						$currentFrame = totalFrames - 1;
						isPlaying = false;
						clearInterval(animationInterval);
					}
				}
			}, 1000 / $selectedFPS);
		} else {
			clearInterval(animationInterval);
		}
	}

	function stop() {
		isPlaying = false;
		clearInterval(animationInterval);
		$currentFrame = 0;
	}

	function goToKeyframe(frame: number) {
		$currentFrame = frame;
	}

	onMount(() => {
		return () => {
			if (animationInterval) clearInterval(animationInterval);
		};
	});
</script>

<div class="panel-row bg-tertiary rounded-lg flex h-full gap-2 p-4">
	<!-- Playback controls -->
	<div class="flex flex-col items-center justify-center w-24">
		<div>
			<button
				class="p-1 rounded-full hover:bg-primary transition-colors duration-200"
				onclick={togglePlay}
				aria-label={isPlaying ? "Pause" : "Play"}
			>
				<Icon
					icon={isPlaying ? "mdi:pause" : "mdi:play"}
					width="24"
					class="text-secondary"
				/>
			</button>
			<button
				class="p-1 rounded-full hover:bg-primary transition-colors duration-200"
				onclick={stop}
				aria-label="Stop"
			>
				<Icon icon="mdi:stop" width="24" class="text-secondary" />
			</button>
		</div>
		<div>
			<input
				type="checkbox"
				id="loop"
				bind:checked={isLooping}
				class="rounded"
			/>
			<label for="loop" class="text-sm text-secondary">Loop</label>
		</div>
	</div>

	<!-- Timeline-->
	<div class="flex-1 flex flex-col justify-center full">
		<div class="flex items-center justify-between text-secondary mb-1">
			<div class="text-sm font-bold">Timeline</div>
			<div class="flex gap-1 items-center">
				<button
					class="p-1 hover:bg-primary rounded transition-colors duration-200"
					onclick={addKeyframe}
					aria-label="Add keyframe"
				>
					<Icon icon="mdi:plus" width="16" />
				</button>
				<button
					class="p-1 hover:bg-primary rounded transition-colors duration-200"
					onclick={deleteKeyframe}
					aria-label="Delete keyframe"
				>
					<Icon icon="mdi:minus" width="16" />
				</button>
			</div>
		</div>

		<div class="h-12 bg-secondary/20 rounded relative">
			{#each Array(Math.ceil(totalFrames / 10)) as _, i}
				<div
					class="absolute top-0 left-0 h-full border-l border-secondary/30"
					style="left: {((i * 10) / totalFrames) * 100}%;"
				>
					<span
						class="absolute top-0 left-1/2 -translate-x-1/2 text-secondary/60 text-xs"
						>{i * 10}</span
					>
				</div>
			{/each}

			<div
				class="absolute top-0 left-0 h-full w-0.5 bg-blue-300 z-10"
				style="left: {($currentFrame / totalFrames) * 100}%"
			></div>

			{#each keyframes as frame}
				<button
					class="absolute top-2 left-0 h-4 w-1 rounded-sm -ml-0.5 bg-red-500 hover:bg-red-700 transition-colors"
					style="left: {(frame / totalFrames) * 100}%; bottom: auto;"
					onclick={() => goToKeyframe(frame)}
					aria-label={`Go to keyframe ${frame}`}
				></button>
			{/each}
		</div>
	</div>

	<!-- Frame settings -->
	<div class="flex flex-col items-center justify-center w-32 space-y-2">
		<div class="flex items-center space-x-1">
			<span class="text-sm text-secondary">FPS:</span>
			<input
				type="number"
				id="fps"
				bind:value={$selectedFPS}
				min="1"
				max="60"
				class="w-12 text-center bg-secondary/20 text-secondary rounded"
			/>
		</div>
		<div class="text-sm text-secondary">
			Frame: {$currentFrame} / {totalFrames - 1}
		</div>
	</div>
</div>
