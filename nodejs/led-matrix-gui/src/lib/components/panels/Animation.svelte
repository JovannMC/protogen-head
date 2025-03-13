<script lang="ts">
	import Icon from "@iconify/svelte";
	import {
		currentFrame,
		matrix,
		selectedFPS,
		totalFrames,
	} from "$lib/stores";
	import { onMount } from "svelte";

	let isPlaying = false;
	let isLooping = true;
	let keyframes: number[] = [0, $totalFrames - 1];
	let animationInterval: ReturnType<typeof setInterval>;
	let isDragging = false;
	let previousMatrixState: any = null;

	function addKeyframe() {
		const newFrame = $currentFrame;
		if (!keyframes.includes(newFrame)) {
			keyframes = [...keyframes, newFrame].sort((a, b) => a - b);
			console.log(`Added keyframe at frame ${newFrame}`);
			interpolateFrames();
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
			interpolateFrames();
		}
	}

	function togglePlay() {
		isPlaying = !isPlaying;

		if (isPlaying) {
			animationInterval = setInterval(() => {
				$currentFrame++;
				if ($currentFrame >= $totalFrames) {
					if (isLooping) $currentFrame = 0;
					else {
						$currentFrame = $totalFrames - 1;
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

	function interpolateFrames() {
		const matrixData = $matrix;

		if (keyframes.length < 2) return;

		for (let panelIndex = 0; panelIndex < matrixData.length; panelIndex++) {
			for (let i = 0; i < keyframes.length - 1; i++) {
				const startFrame = keyframes[i];
				const endFrame = keyframes[i + 1];
				const frameCount = endFrame - startFrame;

				// Skip if frames are adjacent
				if (frameCount <= 1) continue;

				const startData = matrixData[panelIndex][startFrame];
				const endData = matrixData[panelIndex][endFrame];

				// Skip if either keyframe doesn't have data
				if (!startData || !endData) continue;

				console.log(
					`Interpolating between frames ${startFrame} and ${endFrame} for panel ${panelIndex}`,
				);

				// Generate intermediate frames
				for (let frame = startFrame + 1; frame < endFrame; frame++) {
					const t = (frame - startFrame) / frameCount; // Interpolation factor (0-1)

					// Create a new frame if it doesn't exist
					if (!matrixData[panelIndex][frame]) {
						matrixData[panelIndex][frame] = Array(startData.length)
							.fill(0)
							.map(() => Array(startData[0].length).fill(0));
					}

					// Interpolate each pixel
					for (let row = 0; row < startData.length; row++) {
						for (let col = 0; col < startData[row].length; col++) {
							const startColor = startData[row][col];
							const endColor = endData[row][col];

							// Skip if both pixels are black (0)
							if (startColor === 0 && endColor === 0) {
								matrixData[panelIndex][frame][row][col] = 0;
								continue;
							}

							// Interpolate the color
							matrixData[panelIndex][frame][row][col] =
								interpolateColor(startColor, endColor, t);
						}
					}
				}
			}
		}

		// Update the matrix store
		matrix.set(matrixData);
		console.log("Interpolation complete");
	}

	// Helper function to interpolate between two colors
	function interpolateColor(
		startColor: number,
		endColor: number,
		t: number,
	): number {
		// Extract RGB components
		const startR = (startColor >> 16) & 0xff;
		const startG = (startColor >> 8) & 0xff;
		const startB = startColor & 0xff;

		const endR = (endColor >> 16) & 0xff;
		const endG = (endColor >> 8) & 0xff;
		const endB = endColor & 0xff;

		// Interpolate each component
		const r = Math.round(startR + (endR - startR) * t);
		const g = Math.round(startG + (endG - startG) * t);
		const b = Math.round(startB + (endB - startB) * t);

		// Combine back to a single color value
		return (r << 16) | (g << 8) | b;
	}

	function isKeyframe(frame: number): boolean {
		return keyframes.includes(frame);
	}

	function goToKeyframe(frame: number) {
		$currentFrame = frame;
	}

	function handleMouseDown(event: MouseEvent) {
		if ((event.target as HTMLElement).tagName.toLowerCase() === "button")
			return;
		isDragging = true;
		selectFrame(event);
	}

	function handleMouseMove(event: MouseEvent) {
		if ((event.target as HTMLElement).tagName.toLowerCase() === "button")
			return;
		if (isDragging) selectFrame(event);
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleMouseLeave() {
		isDragging = false;
	}

	function selectFrame(event: MouseEvent) {
		const timeline = event.currentTarget as HTMLElement;
		const rect = timeline.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const newFrame = Math.round((x / rect.width) * $totalFrames);
		$currentFrame = Math.min(Math.max(newFrame, 0), $totalFrames - 1);
	}

	onMount(() => {
		const matrixUnsubscribe = matrix.subscribe((matrixData) => {
			if (previousMatrixState === null) {
				previousMatrixState = JSON.stringify(matrixData);
				return;
			}

			const currentMatrixState = JSON.stringify(matrixData);

			if (
				currentMatrixState !== previousMatrixState &&
				isKeyframe($currentFrame)
			) {
				console.log(
					`Keyframe ${$currentFrame} was modified - reinterpolating...`,
				);
				interpolateFrames();
			}

			previousMatrixState = currentMatrixState;
		});

		return () => {
			if (animationInterval) clearInterval(animationInterval);
			matrixUnsubscribe();
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

		<div
			class="h-12 bg-secondary/20 rounded relative"
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseLeave}
			role="slider"
			aria-valuemin="0"
			aria-valuemax={$totalFrames - 1}
			aria-valuenow={$currentFrame}
			tabindex="0"
		>
			{#each Array(Math.ceil($totalFrames / 10)) as _, i}
				<div
					class="absolute top-0 left-0 h-full border-l border-secondary/30"
					style="left: {((i * 10) / $totalFrames) * 100}%;"
				>
					<span
						class="absolute top-0 left-1/2 -translate-x-1/2 text-secondary/60 text-xs"
						>{i * 10}</span
					>
				</div>
			{/each}

			<div
				class="absolute top-0 left-0 h-full w-0.5 bg-blue-300 z-10"
				style="left: {($currentFrame / $totalFrames) * 100}%"
			></div>

			{#each keyframes as frame}
				<button
					class="absolute top-2 left-0 h-4 w-1 rounded-sm -ml-0.5 bg-red-500 hover:bg-red-700 transition-colors"
					style="left: {(frame / $totalFrames) * 100}%; bottom: auto;"
					onclick={() => goToKeyframe(frame)}
					aria-label={`Go to keyframe ${frame}`}
				></button>
			{/each}
		</div>
	</div>

	<!-- Frame settings -->
	<div class="flex flex-col items-center justify-center w-32 space-y-1">
		<div class="flex items-center space-x-1 text-sm">
			<span class="text-xs text-secondary">FPS:</span>
			<input
				type="number"
				id="fps"
				bind:value={$selectedFPS}
				min="1"
				max="60"
				class="w-12 text-center bg-secondary/20 text-secondary rounded"
			/>
		</div>
		<div
			class="flex flex-col items-center text-xs text-secondary space-y-1"
		>
			<p>Frame:</p>
			<p>
				{$currentFrame + 1} /
				<input
					type="number"
					min="1"
					class="w-12 text-center bg-secondary/20 text-secondary rounded"
					bind:value={$totalFrames}
				/>
			</p>
		</div>
	</div>
</div>
