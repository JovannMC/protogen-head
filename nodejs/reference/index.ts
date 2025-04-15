import { LedMatrix, GpioMapping } from "rpi-led-matrix";
import { readFileSync } from "fs";
import { join } from "path";

let currentFrame = 0;
let intervalId: NodeJS.Timer | null = null;

/*
 * Main settings
 */
const LAYOUT_FILE = join(__dirname, "panels.json");
const CHAIN_LENGTH = 1;
const CHAIN_TYPE: ChainType = "horizontal";
const FPS = 30;
const MIRROR_X = true;
const MIRROR_Y = true;

async function main() {
	try {
		const matrix = new LedMatrix(
			{
				...LedMatrix.defaultMatrixOptions(),
				cols: 64,
				rows: 32,
				chainLength: CHAIN_LENGTH,
				hardwareMapping: GpioMapping.AdafruitHat,
				showRefreshRate: true,
			},
			{
				...LedMatrix.defaultRuntimeOptions(),
				// can be any between really, but higher = slower refresh rate, but better for lower current power banks if using most of leds in display(s)
				gpioSlowdown: 1,
			},
		);

		console.log(`Loading data from: ${LAYOUT_FILE}`);
		const animationData: PanelLayout[] = JSON.parse(
			readFileSync(LAYOUT_FILE, "utf-8"),
		);

		// Check data structure
		if (!Array.isArray(animationData) || !Array.isArray(animationData[0])) {
			throw new Error("Invalid animation data format");
		}

		const totalPanels = animationData.length;
		const totalFrames = animationData[0].length;

		console.log(
			`Loaded animation with ${totalFrames} frames for ${totalPanels} panels`,
		);

		const rowsPerPanel = animationData[0][0].length;
		const colsPerPanel = animationData[0][0][0].length;
		console.log(`Panel dimensions: ${colsPerPanel}x${rowsPerPanel}`);

		// Start animation loop
		intervalId = setInterval(() => {
			matrix.clear();

			// Render current frame on each panel
			animationData.forEach((panel, panelIndex) => {
				const frameData = panel[currentFrame];

				// Calculate panel offset in chain
				let panelXOffset = 0;
				let panelYOffset = 0;
				if (CHAIN_LENGTH) {
					panelXOffset =
						CHAIN_TYPE === "horizontal"
							? panelIndex * colsPerPanel
							: 0;
					panelYOffset =
						CHAIN_TYPE === "vertical"
							? panelIndex * rowsPerPanel
							: 0;
				}

				frameData.forEach((row, y) => {
					row.forEach((colorInt, x) => {
						let mirroredX = MIRROR_X ? colsPerPanel - 1 - x : x;
						let mirroredY = MIRROR_Y ? rowsPerPanel - 1 - y : y;
						if (colorInt !== 0) {
							const r = (colorInt >> 16) & 0xff;
							const g = (colorInt >> 8) & 0xff;
							const b = colorInt & 0xff;

							matrix
								.fgColor({ r, g, b })
								.setPixel(
									panelXOffset + mirroredX,
									panelYOffset + mirroredY,
								);
						}
					});
				});
			});

			matrix.sync();

			// Update frame counter
			currentFrame = (currentFrame + 1) % totalFrames;
		}, 1000 / FPS);

		process.stdin.resume();

		process.on("SIGINT", () => {
			console.log("Shutting down...");
			if (intervalId) clearInterval(intervalId);
			matrix.clear();
			matrix.sync();
			process.exit(0);
		});
	} catch (err) {
		console.error(`Error: ${err}`);
		process.exit(1);
	}
}

main();

/*
 * Types
 */

type ChainType = "horizontal" | "vertical";
type RGBInt = number;
type PixelRow = RGBInt[];
type Panel = PixelRow[];
type PanelLayout = Panel[];
