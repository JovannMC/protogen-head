import { currentToolSize, rows, columns } from "$lib/stores";
import { get } from "svelte/store";
import { getPixelFromCoords, rgbToHex, setPixelColor } from "./matrix";

// Implement Bresenham's line algorithm
export function drawLine(
	matrixContainer: HTMLElement,
	startRow: number,
	startCol: number,
	endRow: number,
	endCol: number,
	color: string,
	isPreview: boolean,
	storeOriginalColor: (row: number, col: number) => void,
) {
	const dx = Math.abs(endCol - startCol);
	const dy = Math.abs(endRow - startRow);
	const sx = startCol < endCol ? 1 : -1;
	const sy = startRow < endRow ? 1 : -1;
	let err = dx - dy;

	let row = startRow;
	let col = startCol;

	while (true) {
		for (
			let r = row - Math.floor(get(currentToolSize) / 2);
			r <= row + Math.floor(get(currentToolSize) / 2);
			r++
		) {
			for (
				let c = col - Math.floor(get(currentToolSize) / 2);
				c <= col + Math.floor(get(currentToolSize) / 2);
				c++
			) {
				const pixel = getPixelFromCoords(matrixContainer, r, c);
				if (pixel) {
					if (isPreview) storeOriginalColor(r, c);
					setPixelColor(pixel, color);
				}
			}
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

export function drawRectangle(
	matrixContainer: HTMLElement,
	startRow: number,
	startCol: number,
	endRow: number,
	endCol: number,
	color: string,
	isPreview: boolean,
	storeOriginalColor: (row: number, col: number) => void,
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
				for (
					let r = row - Math.floor(get(currentToolSize) / 2);
					r <= row + Math.floor(get(currentToolSize) / 2);
					r++
				) {
					for (
						let c = col - Math.floor(get(currentToolSize) / 2);
						c <= col + Math.floor(get(currentToolSize) / 2);
						c++
					) {
						const pixel = getPixelFromCoords(matrixContainer, r, c);
						if (pixel) {
							if (isPreview) storeOriginalColor(r, c);
							setPixelColor(pixel, color);
						}
					}
				}
			}
		}
	}
}

export function drawEllipse(
	matrixContainer: HTMLElement,
	startRow: number,
	startCol: number,
	endRow: number,
	endCol: number,
	color: string,
	isPreview: boolean,
	storeOriginalColor: (row: number, col: number) => void,
) {
	const centerRow = (startRow + endRow) / 2;
	const centerCol = (startCol + endCol) / 2;
	const radiusRow = Math.abs(endRow - startRow) / 2;
	const radiusCol = Math.abs(endCol - startCol) / 2;

	// Adjust step size based on ellipse size to avoid too many points
	const circumference =
		2 *
		Math.PI *
		Math.sqrt((radiusRow * radiusRow + radiusCol * radiusCol) / 2);
	const step = Math.max(0.01, Math.min(0.2, 1 / circumference));

	// Track which pixels we've already processed to avoid redundant operations
	const processedPixels = new Set<string>();

	// Using parametric form of ellipse to get points
	for (let theta = 0; theta < 2 * Math.PI; theta += step) {
		const row = Math.round(centerRow + radiusRow * Math.sin(theta));
		const col = Math.round(centerCol + radiusCol * Math.cos(theta));

		if (row >= 0 && row < get(rows) && col >= 0 && col < get(columns)) {
			// Apply tool size properly - for size 1, only color the exact point
			// For size > 1, create an appropriate radius
			const offset = Math.floor((get(currentToolSize) - 1) / 2);

			for (let r = row - offset; r <= row + offset; r++) {
				for (let c = col - offset; c <= col + offset; c++) {
					// Skip if outside the matrix or already processed
					if (r < 0 || r >= get(rows) || c < 0 || c >= get(columns))
						continue;

					const key = `${r},${c}`;
					if (processedPixels.has(key)) continue;
					processedPixels.add(key);

					const pixel = getPixelFromCoords(matrixContainer, r, c);
					if (pixel) {
						if (isPreview) storeOriginalColor(r, c);
						setPixelColor(pixel, color);
					}
				}
			}
		}
	}
}

export function floodFill(
	matrixContainer: HTMLElement,
	row: number,
	col: number,
	newColor: string,
) {
	const pixel = getPixelFromCoords(matrixContainer, row, col);
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

		const currentPixel = getPixelFromCoords(matrixContainer, r, c);
		if (!currentPixel) continue;

		const currentColor =
			window.getComputedStyle(currentPixel).backgroundColor;
		if (rgbToHex(currentColor) !== rgbToHex(targetColor)) continue;

		setPixelColor(currentPixel, newColor);

		// Add adjacent pixels to queue
		if (r > 0) queue.push([r - 1, c]);
		if (r < get(rows) - 1) queue.push([r + 1, c]);
		if (c > 0) queue.push([r, c - 1]);
		if (c < get(columns) - 1) queue.push([r, c + 1]);
	}
}
