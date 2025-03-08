import { get, writable } from "svelte/store";
import { matrix } from "$lib/stores";

export const pastStates = writable<[number, any[]][]>([]);
export const futureStates = writable<[number, any[]][]>([]);

// FIXME: this shit is so buggy.
// it works for simple undos (1-2), but as soon as you start drawing again itll break and you wont be able to redo
// i don't think i'm gonna bother lmfao

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
