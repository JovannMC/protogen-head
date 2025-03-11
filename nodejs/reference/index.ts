import { LedMatrix, GpioMapping } from "rpi-led-matrix";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Main settings
 */
const LAYOUT_FILE = join(__dirname, "panels.json");
const chainType: ChainType = "horizontal";

async function main() {
	try {
		const matrix = new LedMatrix(
			{
				...LedMatrix.defaultMatrixOptions(),
				cols: 64,
				rows: 32,
				chainLength: 1,
				hardwareMapping: GpioMapping.AdafruitHat,
				showRefreshRate: true,
			},
			{
				...LedMatrix.defaultRuntimeOptions(),
				// can any between really, but higher = slower refresh rate, but better for lower current power banks if using most of display(s)
				gpioSlowdown: 1,
			},
		);

		console.log(`Loading data from: ${LAYOUT_FILE}`);
		const panelLayout: PanelLayout = JSON.parse(
			readFileSync(LAYOUT_FILE, "utf-8"),
		);
		console.log(`Loaded data for ${panelLayout.length} panels`);

		const rowsPerPanel = panelLayout[0].length;
		const colsPerPanel = panelLayout[0][0].length;
		console.log(`Panel dimensions: ${colsPerPanel}x${rowsPerPanel}`);

		matrix.clear();

		// Render data on each matrix
		panelLayout.forEach((panel, panelIndex) => {
			// Calculate panel offset in chain
			const panelXOffset =
				chainType === "horizontal" ? panelIndex * colsPerPanel : 0;
			const panelYOffset =
				chainType === "vertical" ? panelIndex * rowsPerPanel : 0;

			panel.forEach((row, y) => {
				row.forEach((colorInt, x) => {
					if (colorInt !== 0) {
						const r = (colorInt >> 16) & 0xff;
						const g = (colorInt >> 8) & 0xff;
						const b = colorInt & 0xff;

						matrix
							.fgColor({ r, g, b })
							.setPixel(panelXOffset + x, panelYOffset + y);
					}
				});
			});
		});

		matrix.sync();
		process.stdin.resume();

		process.on("SIGINT", () => {
			console.log("Shutting down...");
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
