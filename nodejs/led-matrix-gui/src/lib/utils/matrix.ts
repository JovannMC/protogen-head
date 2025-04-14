import {
	matrix,
	currentFrame,
	rows,
	columns,
	currentToolSize,
} from "$lib/stores";
import { get } from "svelte/store";

export function rgbToHex(rgb: string): string {
	if (!rgb || rgb === "transparent") return "transparent";
	const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	if (!match) return rgb;
	const r = +match[1];
	const g = +match[2];
	const b = +match[3];
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Getting from matrix
export function getPixelCoordinates(
	element: HTMLElement,
): { row: number; col: number } | null {
	const row = +element.dataset.row!;
	const col = +element.dataset.col!;
	if (isNaN(row) || isNaN(col)) return null;
	return { row, col };
}

export function getPixelFromCoords(
	matrixContainer: HTMLElement,
	row: number,
	col: number,
): HTMLElement | null {
	return matrixContainer.querySelector(
		`[data-row="${row}"][data-col="${col}"]`,
	);
}

// Updating matrix
export function setPixelColor(element: HTMLElement, color: string) {
	element.style.backgroundColor = color;
}

export function updateMatrixDisplay(
	matrixContainer: HTMLElement,
	panelData: number[][],
	panelIndex: number,
	updateStore = true,
) {
	const matrixData = Array.from({ length: get(rows) }, () =>
		Array(get(columns)).fill(0),
	);
	const leds = matrixContainer.querySelectorAll<HTMLElement>(".led");

	leds.forEach((led, i) => {
		led.style.backgroundColor = "#000000";
		const col = i % get(columns);
		const row = Math.floor(i / get(columns));
		if (
			panelData &&
			panelData[row] &&
			row < panelData.length &&
			col < panelData[row].length
		) {
			const color = panelData[row][col];
			let hexString = color.toString(16);
			while (hexString.length < 6) hexString = "0" + hexString;
			const hexColor = color === 0 ? "#000000" : `#${hexString}`;
			led.style.backgroundColor = hexColor;
			matrixData[row][col] = color;
		}
	});

	if (!updateStore) return;
	matrix.update((matrices) => {
		if (!matrices[panelIndex]) matrices[panelIndex] = [];
		if (!matrices[panelIndex][get(currentFrame)]) {
			matrices[panelIndex][get(currentFrame)] = [];
		}
		matrices[panelIndex][get(currentFrame)] = matrixData;
		return matrices;
	});
}

export function applyTool(
	matrixContainer: HTMLElement,
	pixel: HTMLElement,
	color: string,
	panelIndex: number,
) {
	const coords = getPixelCoordinates(pixel);
	if (!coords) return;

	const { row, col } = coords;

	// ensure exact tool size width/height
	const startR = row - Math.floor((get(currentToolSize) - 1) / 2);
	const endR = row + Math.floor(get(currentToolSize) / 2);
	const startC = col - Math.floor((get(currentToolSize) - 1) / 2);
	const endC = col + Math.floor(get(currentToolSize) / 2);

	for (let r = startR; r <= endR; r++) {
		for (let c = startC; c <= endC; c++) {
			const targetPixel = getPixelFromCoords(matrixContainer, r, c);
			if (targetPixel) setPixelColor(targetPixel, color);
			if (r >= 0 && r < get(rows) && c >= 0 && c < get(columns)) {
				matrix.update((matrices) => {
					if (!matrices[panelIndex]) matrices[panelIndex] = [];
					if (!matrices[panelIndex][get(currentFrame)]) {
						matrices[panelIndex][get(currentFrame)] = Array(get(rows))
							.fill(0)
							.map(() => Array(get(columns)).fill(0));
					}
					if (!matrices[panelIndex][get(currentFrame)][r]) {
						matrices[panelIndex][get(currentFrame)][r] = Array(
							get(columns),
						).fill(0);
					}

					matrices[panelIndex][get(currentFrame)][r][c] = parseInt(
						color.slice(1),
						16,
					);

					return matrices;
				});
			}
		}
	}
}
