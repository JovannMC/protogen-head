import { get, writable } from "svelte/store";
import {
	columns,
	currentFrame,
	matrix,
	rows,
	selectedPanel,
	type LEDMatrix,
} from "$lib/stores";

export const pastStates = writable<[number, any[]][]>([]);
export const futureStates = writable<[number, any[]][]>([]);
export const copiedMatrix = writable<LEDMatrix[]>([]);

// FIXME: this shit is so buggy.
// it works for simple undos (1-2), but as soon as you start drawing again itll break and you wont be able to redo
// i don't think i'm gonna bother lmfao

// update 2025/03/15:
// okay it's pretty much broken, i'm not gonna bother lmao
// at least you can do a simple undo just in case, but ofc for anything else, screw me!

export function addToHistory(panelIndex: number, matrices: any[]) {
	console.log(`Adding to history for panel ${panelIndex}`);

	const stateToSave: [number, any[]] = [
		panelIndex,
		JSON.parse(JSON.stringify(matrices)),
	];

	pastStates.update((states) => [...states, stateToSave]);
	futureStates.set([]);
}

export function initHistory() {
	const currentMatrix = get(matrix);
	if (currentMatrix.length > 0) {
		pastStates.set([[0, JSON.parse(JSON.stringify(currentMatrix))]]);
		futureStates.set([]);
	}
}

export function undo() {
	console.log("Undo");
	pastStates.update((past) => {
		if (past.length <= 1) return past;

		const lastState = past.pop()!;
		futureStates.update((future) => [...future, lastState]);

		const currentState = past[past.length - 1];
		const panelIndex = currentState[0];
		const panelData = currentState[1][panelIndex];

		matrix.set(currentState[1]);

		setTimeout(() => {
			document.getElementById(`panel-${panelIndex}`)?.dispatchEvent(
				new CustomEvent("update-matrix", {
					detail: {
						panelData,
					},
				}),
			);
		}, 0);

		return past;
	});
}

export function redo() {
	console.log("Redo");
	futureStates.update((future) => {
		if (future.length === 0) return future;

		const nextState = future.pop()!;
		pastStates.update((past) => [...past, nextState]);

		const panelIndex = nextState[0];
		const panelData = nextState[1][panelIndex];

		matrix.set(nextState[1]);

		setTimeout(() => {
			document.getElementById(`panel-${panelIndex}`)?.dispatchEvent(
				new CustomEvent("update-matrix", {
					detail: {
						panelData,
					},
				}),
			);
		}, 0);

		return future;
	});
}

export function limitHistorySize(maxSize = 50) {
	pastStates.update((past) => {
		if (past.length > maxSize) {
			return past.slice(past.length - maxSize);
		}
		return past;
	});
}

export function copy() {
	// Get current frame data from all panels
	const currentMatrices = get(matrix);
	const frame = get(currentFrame);
	const panelIndex = get(selectedPanel);

	let copiedData: LEDMatrix[];

	if (panelIndex === -1) {
		// Copy data for all panels
		copiedData = currentMatrices.map((panel) => {
			if (panel && panel[frame]) {
				// Deep copy the 2D array for this panel at the current frame
				return JSON.parse(JSON.stringify(panel[frame]));
			}
			// If no data exists for this panel at this frame, return empty matrix
			return Array(get(rows))
				.fill(0)
				.map(() => Array(get(columns)).fill(0));
		});
		console.log(
			`Copied frame ${frame} data from all ${copiedData.length} panels`,
		);
	} else {
		// Copy data for the selected panel only
		if (currentMatrices[panelIndex] && currentMatrices[panelIndex][frame]) {
			copiedData = [
				JSON.parse(JSON.stringify(currentMatrices[panelIndex][frame])),
			];
		} else {
			copiedData = [
				Array(get(rows))
					.fill(0)
					.map(() => Array(get(columns)).fill(0)),
			];
		}
		console.log(`Copied frame ${frame} data from panel ${panelIndex}`);
	}

	// Save to the store
	copiedMatrix.set(copiedData);
}

export function paste() {
	const copied = get(copiedMatrix);
	if (copied.length === 0) {
		console.log("Nothing to paste");
		return;
	}

	const currentMatrices = get(matrix);
	const frame = get(currentFrame);
	const panelIndex = get(selectedPanel);

	console.log(`Pasting to frame ${frame}`);

	try {
		// Create a deep copy of the current matrix state
		const newMatrices = JSON.parse(JSON.stringify(currentMatrices));

		if (panelIndex === -1) {
			// Update all panels with the copied data
			copied.forEach((panelData, panelIndex) => {
				if (panelIndex < newMatrices.length) {
					// Ensure the frame exists
					if (!newMatrices[panelIndex][frame]) {
						newMatrices[panelIndex][frame] = JSON.parse(
							JSON.stringify(panelData),
						);
					} else {
						newMatrices[panelIndex][frame] = JSON.parse(
							JSON.stringify(panelData),
						);
					}

					// Dispatch custom event to update the UI
					setTimeout(() => {
						document
							.getElementById(`panel-${panelIndex}`)
							?.dispatchEvent(
								new CustomEvent("update-matrix", {
									detail: {
										panelData:
											newMatrices[panelIndex][frame],
									},
								}),
							);
					}, 0);
				}
			});
			console.log(
				`Pasted data to ${Math.min(copied.length, currentMatrices.length)} panels`,
			);
		} else {
			// Update only the selected panel with the copied data
			if (panelIndex < newMatrices.length && copied[0]) {
				if (!newMatrices[panelIndex][frame]) {
					newMatrices[panelIndex][frame] = JSON.parse(
						JSON.stringify(copied[0]),
					);
				} else {
					newMatrices[panelIndex][frame] = JSON.parse(
						JSON.stringify(copied[0]),
					);
				}

				// Dispatch custom event to update the UI
				setTimeout(() => {
					document
						.getElementById(`panel-${panelIndex}`)
						?.dispatchEvent(
							new CustomEvent("update-matrix", {
								detail: {
									panelData: newMatrices[panelIndex][frame],
								},
							}),
						);
				}, 0);

				console.log(`Pasted data to panel ${panelIndex}`);
			}
		}

		// Update the matrix store with new data
		matrix.set(newMatrices);

		// Add the change to history
		addToHistory(0, newMatrices);
	} catch (err) {
		console.error(`Error during paste operation: ${err}`);
	}
}
