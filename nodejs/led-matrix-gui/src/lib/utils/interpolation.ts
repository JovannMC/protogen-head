import { get } from "svelte/store";
import { interpolate, interpolationType } from "../stores/index";

export function interpolateFrameRange(
	startFrame: number,
	endFrame: number,
	matrixData: any,
) {
	if (!get(interpolate) || startFrame < 0 || endFrame < 0) return;

	const frameCount = endFrame - startFrame;
	if (frameCount <= 1) return;

	const currentInterpolationType = get(interpolationType);
	console.log(`Using interpolation type: ${currentInterpolationType}`);

	for (let panelIndex = 0; panelIndex < matrixData.length; panelIndex++) {
		const startData = matrixData[panelIndex][startFrame];
		const endData = matrixData[panelIndex][endFrame];
		if (!startData || !endData) continue;

		console.log(
			`Interpolating between frames ${startFrame} and ${endFrame} for panel: ${panelIndex}`,
		);

		// Generate intermediate frames
		for (let frame = startFrame + 1; frame < endFrame; frame++) {
			let t = (frame - startFrame) / frameCount; // Base interpolation factor (0-1)

			// Create a new frame if it doesn't exist
			if (!matrixData[panelIndex][frame]) {
				matrixData[panelIndex][frame] = Array(startData.length)
					.fill(0)
					.map(() => Array(startData[0].length).fill(0));
			}

			// Interpolate each pixel
			for (let row = 0; row < startData.length; row++) {
				for (let col = 0; col < startData[row].length; col++) {
					if (currentInterpolationType.startsWith("scroll")) {
						// Determine direction based on interpolation type
						let direction = 1; // Default direction for left to right (scroll-ltr)
						if (currentInterpolationType === "scroll-rtl")
							direction = -1;
						if (currentInterpolationType === "scroll-btt")
							direction = -1;
						if (currentInterpolationType === "scroll-ttb")
							direction = 1;

						if (
							currentInterpolationType === "scroll-ltr" ||
							currentInterpolationType === "scroll-rtl"
						) {
							// Horizontal scroll
							const sourceCol = Math.floor(
								col +
									startData[row].length * (1 - t) * direction,
							);
							if (
								sourceCol >= 0 &&
								sourceCol < startData[row].length
							) {
								matrixData[panelIndex][frame][row][col] =
									endData[row][sourceCol];
							} else {
								matrixData[panelIndex][frame][row][col] = 0; // Black for pixels not yet visible
							}
						} else if (
							currentInterpolationType === "scroll-btt" ||
							currentInterpolationType === "scroll-ttb"
						) {
							// Vertical scroll
							const sourceRow = Math.floor(
								row + startData.length * (1 - t) * direction,
							);
							if (
								sourceRow >= 0 &&
								sourceRow < startData.length
							) {
								matrixData[panelIndex][frame][row][col] =
									endData[sourceRow][col];
							} else {
								matrixData[panelIndex][frame][row][col] = 0; // Black for pixels not yet visible
							}
						}
					} else {
						// Standard interpolation for other types
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
}

export function interpolateColor(
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
