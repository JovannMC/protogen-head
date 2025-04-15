<script lang="ts">
	import Icon from "@iconify/svelte";
	import {
		currentFrame,
		isDrawingMatrix,
		matrix,
		selectedFPS,
		totalFrames,
		interpolate,
		interpolationType,
	} from "$lib/stores";
	import { onMount } from "svelte";
	import { interpolateFrameRange } from "$lib/utils/interpolation";

	// TODO: click and drag keyframes to move (or select multiple to delete)
	// TODO: duplicate keyframes (right click menu)
	// TODO: popup/toast system
	// TODO: click and drag to select what to copy (prob hold ctrl or shift)
	// TODO: fix disabling interpolation, not turning it off
	// either when disabling, clearing all interpolated frames or somehow make it easier idk
	// TODO: if importing, keyframes should be added (i forgot to do that, need to save it in the file - maybe add a boolean to the frame?)
	// TODO: or... just save "metadata" at the beginning/end of file (like a json object) and then parse it when importing

	let isPlaying = false;
	let isLooping = true;
	let keyframes: number[] = [0, $totalFrames - 1];
	let animationInterval: ReturnType<typeof setInterval>;
	let isDragging = false;
	let previousKeyframes: Record<number, string> = {};
	let lastClickTime: Record<string, number | null> = {};

	function addKeyframe() {
		const newFrame = $currentFrame;
		if (!keyframes.includes(newFrame)) {
			const insertIndex = keyframes.findIndex(
				(frame) => frame > newFrame,
			);
			const position =
				insertIndex === -1 ? keyframes.length : insertIndex;

			// Add the keyframe
			keyframes = [
				...keyframes.slice(0, position),
				newFrame,
				...keyframes.slice(position),
			];
			console.log(`Added keyframe at frame ${newFrame}`);

			// Get the previous and next keyframes
			const prevKeyframe = position > 0 ? keyframes[position - 1] : null;
			const nextKeyframe =
				position < keyframes.length - 1
					? keyframes[position + 1]
					: null;

			// Only interpolate the affected ranges
			if (prevKeyframe !== null) {
				interpolateFrameRange(prevKeyframe, newFrame, $matrix);
			}
			if (nextKeyframe !== null) {
				interpolateFrameRange(newFrame, nextKeyframe, $matrix);
			}
		}
	}

	function deleteKeyframe() {
		const currentTime = Date.now();
		if (
			lastClickTime["delete"] &&
			currentTime - lastClickTime["delete"] < 300
		) {
			console.log("Double click detected, clearing keyframes.");
			keyframes = [];
			previousKeyframes = {};
			lastClickTime["delete"] = null;
			return;
		} else {
			lastClickTime["delete"] = currentTime;
		}

		if (keyframes.length > 1 && keyframes.includes($currentFrame)) {
			// Find index of the keyframe to delete
			const deleteIndex = keyframes.indexOf($currentFrame);

			// Get adjacent keyframes before deletion
			const prevKeyframe =
				deleteIndex > 0 ? keyframes[deleteIndex - 1] : null;
			const nextKeyframe =
				deleteIndex < keyframes.length - 1
					? keyframes[deleteIndex + 1]
					: null;

			// Delete the keyframe
			keyframes = keyframes.filter((frame) => frame !== $currentFrame);

			// Move to nearest keyframe
			const nearestKeyframe = keyframes.reduce((prev, curr) =>
				Math.abs(curr - $currentFrame) < Math.abs(prev - $currentFrame)
					? curr
					: prev,
			);
			$currentFrame = nearestKeyframe;

			console.log(
				`Deleted keyframe at frame ${$currentFrame}, moved to ${nearestKeyframe}`,
			);

			// Interpolate between the now-adjacent keyframes
			if (prevKeyframe !== null && nextKeyframe !== null) {
				interpolateFrameRange(prevKeyframe, nextKeyframe, $matrix);
			}
		}
	}

	function clearEverything() {
		const currentTime = Date.now();
		if (
			lastClickTime["clear"] &&
			currentTime - lastClickTime["clear"] < 300
		) {
			console.log("Double click detected, clearing everything.");
			matrix.update((matrices) => {
				const newMatrices = [...matrices];

				for (
					let panelIndex = 0;
					panelIndex < newMatrices.length;
					panelIndex++
				) {
					if (newMatrices[panelIndex]) {
						newMatrices[panelIndex] = newMatrices[panelIndex].map(
							() =>
								Array.from({ length: $totalFrames }, () => []),
						);
					}
				}

				// updates current frame
				newMatrices.forEach((_, panelIndex) => {
					const panel = document.getElementById(
						`panel-${panelIndex}`,
					);
					if (panel) {
						panel.dispatchEvent(
							new CustomEvent("update-matrix", {
								detail: {
									panelData:
										newMatrices[panelIndex][
											$currentFrame
										] || [],
								},
							}),
						);
					}
				});

				return newMatrices;
			});
			lastClickTime["clear"] = null;
			return;
		} else {
			lastClickTime["clear"] = currentTime;
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

	function selectFrame(event: MouseEvent) {
		const timeline = event.currentTarget as HTMLElement;
		const rect = timeline.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const newFrame = Math.round((x / rect.width) * $totalFrames);
		$currentFrame = Math.min(Math.max(newFrame, 0), $totalFrames - 1);
	}

	onMount(() => {
		const matrixUnsubscribe = matrix.subscribe((matrixData) => {
			if ($isDrawingMatrix) return;

			if (keyframes.includes($currentFrame)) {
				try {
					// Get stringified data for just this frame
					const currentKeyframeData = matrixData
						.map((panel) =>
							panel && panel[$currentFrame]
								? JSON.stringify(panel[$currentFrame])
								: null,
						)
						.join("|");

					// Check if this frame has changed by comparing strings
					if (
						!previousKeyframes[$currentFrame] ||
						previousKeyframes[$currentFrame] !== currentKeyframeData
					) {
						console.log(
							`Keyframe ${$currentFrame} was modified - reinterpolating...`,
						);

						previousKeyframes[$currentFrame] = currentKeyframeData;

						// Only interpolate between affected keyframes
						const keyframeIndex = keyframes.indexOf($currentFrame);
						if (keyframeIndex >= 0) {
							const prevKeyframe =
								keyframeIndex > 0
									? keyframes[keyframeIndex - 1]
									: null;
							const nextKeyframe =
								keyframeIndex < keyframes.length - 1
									? keyframes[keyframeIndex + 1]
									: null;

							if (prevKeyframe !== null)
								interpolateFrameRange(
									prevKeyframe,
									$currentFrame,
									matrixData,
								);
							if (nextKeyframe !== null)
								interpolateFrameRange(
									$currentFrame,
									nextKeyframe,
									matrixData,
								);
						}
					}
				} catch (err) {
					console.error(`Error processing matrix update: ${err}`);
				}
			}

			return () => {
				if (animationInterval) clearInterval(animationInterval);
				matrixUnsubscribe();
			};
		});

		return () => {
			if (animationInterval) clearInterval(animationInterval);
			matrixUnsubscribe();
		};
	});
</script>

<div class="panel-row bg-tertiary rounded-lg flex h-full gap-2 p-4">
	<!-- Playback controls -->
	<div class="flex flex-col items-center justify-center w-24 gap-2">
		<div>
			<input
				type="checkbox"
				id="interpolate"
				bind:checked={$interpolate}
			/>
			<label for="interpolate" class="text-sm text-secondary"
				>Interpolate</label
			>
		</div>
		<div>
			<select
				id="interpolationType"
				bind:value={$interpolationType}
				class="w-min h-8 !text-xs"
				disabled={!$interpolate}
			>
				<option value="ease">Ease</option>
				<option value="scroll-rtl">Scroll RTL</option>
				<option value="scroll-ltr">Scroll LTR</option>
				<option value="scroll-ttb">Scroll TTB</option>
				<option value="scroll-btt">Scroll BTT</option>
			</select>
		</div>
	</div>

	<!-- Timeline-->
	<div class="flex-1 flex flex-col justify-center full">
		<div class="flex items-center justify-between text-secondary mb-1">
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
			<div class="flex gap-1 items-center">
				<button
					class="p-1 hover:bg-primary rounded transition-colors duration-200"
					onclick={clearEverything}
					aria-label="Add keyframe"
				>
					<Icon icon="bi:trash" width="16" class="text-red-400 " />
				</button>
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
			onmouseup={() => (isDragging = false)}
			onmouseleave={() => (isDragging = false)}
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
					onclick={() => ($currentFrame = frame)}
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
