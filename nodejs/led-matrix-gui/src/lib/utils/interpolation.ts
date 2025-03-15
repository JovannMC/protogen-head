export function interpolateFrameRange(startFrame: number, endFrame: number, matrixData: any) {
    const frameCount = endFrame - startFrame;
    if (frameCount <= 1) return;

    for (let panelIndex = 0; panelIndex < matrixData.length; panelIndex++) {
        const startData = matrixData[panelIndex][startFrame];
        const endData = matrixData[panelIndex][endFrame];
        if (!startData || !endData) continue;

        console.log(`Interpolating between frames ${startFrame} and ${endFrame} for panel ${panelIndex}`);

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

export function interpolateColor(startColor: number, endColor: number, t: number): number {
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