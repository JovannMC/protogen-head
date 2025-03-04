<script lang="ts">
	import {
		columns,
		rows,
		currentColor,
		currentTool,
		currentToolSize,
	} from "$lib/stores";

	// i'll be honest, i used ai for this because i wouldn't be able to figure this out because i'm dumb
	// not like anyone else is gonna use it so.. yeah. if it works it works ig
	// i'm sorry in advance
	// -jovann

	// TODO: implement currentToolSize into drawing tools

	// makes sure tools only affect the current matrix instance
	let matrixContainer: HTMLElement;

	let isDragging = false;
	let tool = $currentTool;
	let startPixel: { row: number; col: number } | null = null;
	let endPixel: { row: number; col: number } | null = null;
	let originalPixelColors = new Map<string, string>();

	currentTool.subscribe((value) => {
		tool = value;
	});

	function getPixelCoordinates(
		element: HTMLElement,
	): { row: number; col: number } | null {
		// Extract row and column from dataset
		const row = parseInt(element.dataset.row || "");
		const col = parseInt(element.dataset.col || "");

		if (isNaN(row) || isNaN(col)) return null;
		return { row, col };
	}

	function getPixelFromCoords(row: number, col: number): HTMLElement | null {
		return matrixContainer.querySelector(
			`[data-row="${row}"][data-col="${col}"]`,
		);
	}

	function setPixelColor(element: HTMLElement, color: string) {
		element.style.backgroundColor = color;
	}

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

		// TODO handle transparent better (add class/id probably)
		if ($currentColor === "transparent") {
			const computedStyle = getComputedStyle(document.documentElement);
			newColor = computedStyle.getPropertyValue("--bg-tertiary").trim();
		}

		if (tool === "picker") {
			const pixelColor = window.getComputedStyle(pixel).backgroundColor;
			currentColor.set(rgbToHex(pixelColor));
			return;
		}

		if (tool === "fill") {
			const coords = getPixelCoordinates(pixel);
			if (coords) floodFill(coords.row, coords.col, newColor);
			return;
		}

		if (tool === "eraser") {
			const computedStyle = getComputedStyle(document.documentElement);
			newColor = computedStyle.getPropertyValue("--bg-tertiary").trim();
		}

		setPixelColor(pixel, newColor);
	}

	function handleMouseDown(event: MouseEvent) {
		let pixel = event.target as HTMLElement;
		if (!pixel.classList.contains("led")) {
			pixel = findNearestLedByCursor(event) ?? pixel;
			if (!pixel) return;
		}

		isDragging = true;

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
		if (!isDragging) return;

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
		if (!isDragging || !startPixel || !endPixel) {
			isDragging = false;
			return;
		}

		// For shape tools, finalize the drawing
		if (["line", "rectangle", "ellipse"].includes(tool)) {
			applyFinalShape();
		}

		isDragging = false;
		startPixel = null;
		endPixel = null;
		originalPixelColors.clear();
	};

	function restoreOriginalColors() {
		originalPixelColors.forEach((color, key) => {
			const [row, col] = key.split(",").map(Number);
			const pixel = getPixelFromCoords(row, col);
			if (pixel) pixel.style.backgroundColor = color;
		});
	}

	function storeOriginalColor(row: number, col: number) {
		const pixel = getPixelFromCoords(row, col);
		if (!pixel) return;

		const key = `${row},${col}`;
		if (!originalPixelColors.has(key)) {
			originalPixelColors.set(key, pixel.style.backgroundColor || "");
		}
	}

	function drawPreview() {
		if (!startPixel || !endPixel) return;

		let newColor = $currentColor;
		if ($currentColor === "transparent") {
			const computedStyle = getComputedStyle(document.documentElement);
			newColor = computedStyle.getPropertyValue("--bg-tertiary").trim();
		}

		if (tool === "line") {
			drawLine(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
			);
		} else if (tool === "rectangle") {
			drawRectangle(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
			);
		} else if (tool === "ellipse") {
			drawEllipse(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				true,
			);
		}
	}

	function applyFinalShape() {
		if (!startPixel || !endPixel) return;

		let newColor = $currentColor;
		if ($currentColor === "transparent") {
			const computedStyle = getComputedStyle(document.documentElement);
			newColor = computedStyle.getPropertyValue("--bg-tertiary").trim();
		}

		if (tool === "line") {
			drawLine(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
			);
		} else if (tool === "rectangle") {
			drawRectangle(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
			);
		} else if (tool === "ellipse") {
			drawEllipse(
				startPixel.row,
				startPixel.col,
				endPixel.row,
				endPixel.col,
				newColor,
				false,
			);
		}
	}

	// Implement Bresenham's line algorithm
	function drawLine(
		startRow: number,
		startCol: number,
		endRow: number,
		endCol: number,
		color: string,
		isPreview: boolean,
	) {
		const dx = Math.abs(endCol - startCol);
		const dy = Math.abs(endRow - startRow);
		const sx = startCol < endCol ? 1 : -1;
		const sy = startRow < endRow ? 1 : -1;
		let err = dx - dy;

		let row = startRow;
		let col = startCol;

		while (true) {
			const pixel = getPixelFromCoords(row, col);
			if (pixel) {
				if (isPreview) storeOriginalColor(row, col);
				setPixelColor(pixel, color);
			}

			if (row === endRow && col === endCol) break;
			const e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				col += sx;
			}
			if (e2 < dx) {
				err += dx;
				row += sy;
			}
		}
	}

	function drawRectangle(
		startRow: number,
		startCol: number,
		endRow: number,
		endCol: number,
		color: string,
		isPreview: boolean,
	) {
		const minRow = Math.min(startRow, endRow);
		const maxRow = Math.max(startRow, endRow);
		const minCol = Math.min(startCol, endCol);
		const maxCol = Math.max(startCol, endCol);

		// Draw the four edges of the rectangle
		for (let row = minRow; row <= maxRow; row++) {
			for (let col = minCol; col <= maxCol; col++) {
				// Only draw the border
				if (
					row === minRow ||
					row === maxRow ||
					col === minCol ||
					col === maxCol
				) {
					const pixel = getPixelFromCoords(row, col);
					if (pixel) {
						if (isPreview) storeOriginalColor(row, col);
						setPixelColor(pixel, color);
					}
				}
			}
		}
	}

	function drawEllipse(
		startRow: number,
		startCol: number,
		endRow: number,
		endCol: number,
		color: string,
		isPreview: boolean,
	) {
		const centerRow = (startRow + endRow) / 2;
		const centerCol = (startCol + endCol) / 2;
		const radiusRow = Math.abs(endRow - startRow) / 2;
		const radiusCol = Math.abs(endCol - startCol) / 2;

		// Using midpoint ellipse algorithm
		for (let row = 0; row < $rows; row++) {
			for (let col = 0; col < $columns; col++) {
				// Check if point is on the ellipse (approximation)
				const normalizedRow = (row - centerRow) / radiusRow;
				const normalizedCol = (col - centerCol) / radiusCol;
				const distance =
					normalizedRow * normalizedRow +
					normalizedCol * normalizedCol;

				// Approximate ellipse border with some tolerance
				if (Math.abs(distance - 1) < 0.2) {
					const pixel = getPixelFromCoords(row, col);
					if (pixel) {
						if (isPreview) storeOriginalColor(row, col);
						setPixelColor(pixel, color);
					}
				}
			}
		}
	}

	function floodFill(row: number, col: number, newColor: string) {
		const pixel = getPixelFromCoords(row, col);
		if (!pixel) return;

		const targetColor = window.getComputedStyle(pixel).backgroundColor;
		if (rgbToHex(targetColor) === newColor) return;

		const queue: [number, number][] = [[row, col]];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const [r, c] = queue.shift()!;
			const key = `${r},${c}`;

			if (visited.has(key)) continue;
			visited.add(key);

			const currentPixel = getPixelFromCoords(r, c);
			if (!currentPixel) continue;

			const currentColor =
				window.getComputedStyle(currentPixel).backgroundColor;
			if (rgbToHex(currentColor) !== rgbToHex(targetColor)) continue;

			setPixelColor(currentPixel, newColor);

			// Add adjacent pixels to queue
			if (r > 0) queue.push([r - 1, c]);
			if (r < $rows - 1) queue.push([r + 1, c]);
			if (c > 0) queue.push([r, c - 1]);
			if (c < $columns - 1) queue.push([r, c + 1]);
		}
	}

	function rgbToHex(rgb: string): string {
		if (!rgb || rgb === "transparent") return "transparent";

		const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		if (!match) return rgb;

		const r = parseInt(match[1]);
		const g = parseInt(match[2]);
		const b = parseInt(match[3]);

		return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	}
</script>

<div
	bind:this={matrixContainer}
	class="grid gap-1"
	style="grid-template-columns: repeat({$columns}, minmax(0, 1fr)); grid-template-rows: repeat({$rows}, minmax(0, 1fr));"
	onmouseup={handleMouseUp}
	onmousedown={handleMouseDown}
	onmouseleave={handleMouseUp}
	ondragstart={(e) => e.preventDefault()}
	role="grid"
	tabindex="0"
	aria-label="LED Matrix"
	draggable={false}
>
	{#each Array($rows) as _, rowIndex}
		{#each Array($columns) as _, colIndex}
			<button
				class="led w-1 h-1 bg-tertiary"
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
