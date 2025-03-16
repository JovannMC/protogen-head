<script lang="ts">
	import { addToHistory } from "$lib/utils/history";
	import {
		columns,
		rows,
		currentColor,
		currentTool,
		matrix,
		matrixHistory,
		currentFrame,
		isDrawingMatrix,
	} from "$lib/stores";
	import { onDestroy, onMount } from "svelte";
	import {
		floodFill,
		drawLine,
		drawRectangle,
		drawEllipse,
	} from "$lib/utils/drawing";
	import { applyTool, getPixelCoordinates, getPixelFromCoords, rgbToHex, updateMatrixDisplay } from "$lib/utils/matrix";

// i'll be honest, i used ai for a lot of the tool code because i wouldn't be able to figure many of the tools out because i'm dumb
	// not like anyone else is gonna use it so.. yeah. if it works it works ig
	// i'm sorry in advance
	// -jovann

	// 2025/03/12 update:
	// oh my fucking god, this animation code is awful. i'm so sorry.
	// enjoy your arrays in an array of arrays in an array of more arrays

	let { index } = $props();

	// makes sure tools only affect the current matrix instance
	let matrixContainer: HTMLElement;
	let currentFrameUnsubscribe: () => void;

	let tool = $currentTool;
	let previousTool: typeof tool = $currentTool;
	let startPixel: { row: number; col: number } | null = null;
	let endPixel: { row: number; col: number } | null = null;
	let originalPixelColors = new Map<string, string>();

	currentTool.subscribe((value) => {
		if (value === "picker" && tool !== "picker") previousTool = tool;
		tool = value;

		// set the selected tool
		document
			.querySelectorAll(".selected")
			.forEach((el) => el.classList.remove("selected"));
		document
			.querySelector(`[aria-label="${value}"]`)
			?.classList.add("selected");
	});

	function findNearestLedByCursor(event: MouseEvent): HTMLElement | null {
		// Get cursor position
		const x = event.clientX;
		const y = event.clientY;

		const leds = matrixContainer.querySelectorAll<HTMLElement>(".led");
		if (!leds.length) return null;

		let closestLed: HTMLElement | null = null;
		let shortestDistance = Infinity;

		leds.forEach((led) => {
			const rect = led.getBoundingClientRect();
			const ledCenterX = rect.left + rect.width / 2;
			const ledCenterY = rect.top + rect.height / 2;

			const distance = Math.sqrt(
				Math.pow(x - ledCenterX, 2) + Math.pow(y - ledCenterY, 2),
			);

			if (distance < shortestDistance) {
				shortestDistance = distance;
				closestLed = led;
			}
		});

		return closestLed;
	}

	function handlePixelClick(event: MouseEvent | KeyboardEvent) {
		let pixel = event.target as HTMLElement;
		if (!pixel.classList.contains("led")) {
			// won't ever be a keyboard event
			pixel = findNearestLedByCursor(event as MouseEvent) ?? pixel;
			if (!pixel) return;
		}

		let newColor = $currentColor;

		if ($currentColor === "transparent") newColor = "#000000";

		if (tool === "picker") {
			const pixelColor = window.getComputedStyle(pixel).backgroundColor;
			currentColor.set(rgbToHex(pixelColor));

			// Switch back to the previous tool after picking a color
			currentTool.set(previousTool);
			return;
		}

		if (tool === "fill") {
			const coords = getPixelCoordinates(pixel);
			if (coords)
				floodFill(matrixContainer, coords.row, coords.col, newColor);
			return;
		}

		if (tool === "eraser") newColor = "#000000";

		applyTool(matrixContainer, pixel, newColor, index);
	}

	function handleMouseDown(event: MouseEvent) {
		let pixel = event.target as HTMLElement;
		if (!pixel.classList.contains("led")) {
			pixel = findNearestLedByCursor(event) ?? pixel;
			if (!pixel) return;
		}

		isDrawingMatrix.set(true);

		const coords = getPixelCoordinates(pixel);
		if (!coords) return;

		startPixel = coords;
		endPixel = coords;

		// Store original colors for preview
		if (["line", "rectangle", "ellipse"].includes(tool)) {
			originalPixelColors.clear();
			// For complex shapes, we'll preview and restore until mouseup
		} else {
			// For simple tools like pen or eraser, just apply directly
			handlePixelClick(event);
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!$isDrawingMatrix) return;

		let pixel = event.target as HTMLElement;
		if (!pixel.classList.contains("led")) {
			pixel = findNearestLedByCursor(event) ?? pixel;
			if (!pixel) return;
		}

		const coords = getPixelCoordinates(pixel);
		if (!coords) return;

		endPixel = coords;

		if (tool === "pen" || tool === "eraser") {
			handlePixelClick(event);
		} else if (["line", "rectangle", "ellipse"].includes(tool)) {
			// Restore original colors before drawing new preview
			restoreOriginalColors();
			// Draw preview based on current tool
			drawPreview();
		}
	}

	const handleMouseUp = () => {
		if (!$isDrawingMatrix || !startPixel || !endPixel) {
			$isDrawingMatrix = false;
			return;
		}

		// For shape tools, finalize the drawing
		if (["line", "rectangle", "ellipse"].includes(tool)) applyFinalShape();

		$isDrawingMatrix = false;
		startPixel = null;
		endPixel = null;
		originalPixelColors.clear();

		const matrixData = Array.from({ length: $rows }, () =>
			Array($columns).fill(0),
		);
		const leds = matrixContainer.querySelectorAll<HTMLElement>(".led");
		leds.forEach((led, i) => {
			const row = Math.floor(i / $columns);
			const col = i % $columns;
			const color = window.getComputedStyle(led).backgroundColor;
			const hexColor = rgbToHex(color);
			const data =
				hexColor === "#000000" ? 0 : parseInt(hexColor.slice(1), 16);
			matrixData[row][col] = data;
		});

		matrix.update((matrices) => {
			if (!matrices[index]) matrices[index] = [];

			// Make sure we're updating the current frame, not replacing the entire panel data
			matrices[index][$currentFrame] = matrixData;

			console.log(`Matrix now has ${matrices[index].length} frames`);
			return matrices;
		});
		matrixHistory.update((history) => {
			const currentMatrices = $matrix;
			history.push([index, currentMatrices]);
			return history;
		});

		addToHistory(index, $matrix);
	};

	function restoreOriginalColors() {
		originalPixelColors.forEach((color, key) => {
			const [row, col] = key.split(",").map(Number);
			const pixel = getPixelFromCoords(matrixContainer, row, col);
			if (pixel) pixel.style.backgroundColor = color;
		});
	}

	function storeOriginalColor(row: number, col: number) {
		const pixel = getPixelFromCoords(matrixContainer, row, col);
		if (!pixel) return;

		const key = `${row},${col}`;
		if (!originalPixelColors.has(key)) {
			originalPixelColors.set(key, pixel.style.backgroundColor || "");
		}
	}

	function drawPreview() {
		if (!startPixel || !endPixel) return;

		let newColor = $currentColor;
		if ($currentColor === "transparent") newColor = "#000000";

		if (tool === "line") {
			drawLine(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
				storeOriginalColor,
			);
		} else if (tool === "rectangle") {
			drawRectangle(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
				storeOriginalColor,
			);
		} else if (tool === "ellipse") {
			drawEllipse(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
				storeOriginalColor,
			);
		}
	}

	function applyFinalShape() {
		if (!startPixel || !endPixel) return;

		let newColor = $currentColor;
		if ($currentColor === "transparent") newColor = "#000000";

		if (tool === "line") {
			drawLine(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
				storeOriginalColor,
			);
		} else if (tool === "rectangle") {
			drawRectangle(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
				storeOriginalColor,
			);
		} else if (tool === "ellipse") {
			drawEllipse(
				matrixContainer,
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
				storeOriginalColor,
			);
		}
	}

	onMount(() => {
		// update-matrix event for importing data
		document
			.getElementById(`panel-${index}`)
			?.addEventListener("update-matrix", (event: Event) => {
				const customEvent = event as CustomEvent<{
					panelData: number[][];
				}>;
				const panelData = customEvent.detail.panelData;
				updateMatrixDisplay(matrixContainer, panelData, index, false);
			});

		currentFrameUnsubscribe = currentFrame.subscribe((frame) => {
			console.log(`Switching to frame ${frame}`);

			if ($matrix[index]) {
				if ($matrix[index][frame]) {
					updateMatrixDisplay(matrixContainer, $matrix[index][frame], index, false);
				} else {
					const emptyFrame = Array.from({ length: $rows }, () =>
						Array($columns).fill(0),
					);

					matrix.update((matrices) => {
						if (!matrices[index]) matrices[index] = [];
						matrices[index][frame] = emptyFrame;
						return matrices;
					});

					updateMatrixDisplay(matrixContainer, emptyFrame, index, false);
				}
			} else {
				// Handle case where panel doesn't exist
				const emptyFrame = Array.from({ length: $rows }, () =>
					Array($columns).fill(0),
				);

				matrix.update((matrices) => {
					matrices[index] = [];
					matrices[index][frame] = emptyFrame;
					return matrices;
				});

				updateMatrixDisplay(matrixContainer, emptyFrame, index, false);
			}
		});
	});

	onDestroy(() => {
		if (currentFrameUnsubscribe) currentFrameUnsubscribe();
	});
</script>

<div
	bind:this={matrixContainer}
	class="grid gap-[3px]"
	style="grid-template-columns: repeat({$columns}, minmax(0, 1fr)); grid-template-rows: repeat({$rows}, minmax(0, 1fr));"
	onmouseup={handleMouseUp}
	onmousedown={handleMouseDown}
	onmouseleave={handleMouseUp}
	ondragstart={(e) => e.preventDefault()}
	role="grid"
	tabindex="0"
	aria-label="LED Matrix"
	draggable={false}
	id={`panel-${index}`}
>
	{#each Array($rows) as _, rowIndex}
		{#each Array($columns) as _, colIndex}
			<button
				class="led w-1 h-1 bg-black"
				data-row={rowIndex}
				data-col={colIndex}
				aria-label="LED"
				onmouseup={handleMouseUp}
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				ondragstart={(e) => e.preventDefault()}
				onkeypress={(e) => e.key === "Enter" && handlePixelClick(e)}
				draggable={false}
			></button>
		{/each}
	{/each}
</div>
