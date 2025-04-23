import { LedMatrix, GpioMapping } from "rpi-led-matrix";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";
import readline from "readline";

let currentFrame = 0;
let intervalId: NodeJS.Timeout | null = null;

/*
 * Main settings
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAYOUT_FILE_PROMISE = promptForJsonFile();
const CHAIN_LENGTH = 2;
const CHAIN_TYPE: ChainType = "horizontal";
const fileName = await LAYOUT_FILE_PROMISE;
const LAYOUT_FILE = join(__dirname, fileName);
const settings = parseSettingsFromFileName(fileName);

const FPS = settings.fps ?? 30;
const MIRROR_X = settings.mirrorX ?? false;
const MIRROR_Y = settings.mirrorY ?? true;

function parseSettingsFromFileName(fileName: string) {
	// Example: (name)--(fps)_mirrorX_mirrorY.json
	const base = fileName.replace(/\.json$/, "");
	const parts = base.split("--");
	if (parts.length < 2) return {};

	const settingsPart = parts[1];
	const [fpsStr, mirrorXStr, mirrorYStr] = settingsPart.split("_");

	const parsed: { fps?: number; mirrorX?: boolean; mirrorY?: boolean } = {};

	if (fpsStr && !isNaN(Number(fpsStr))) parsed.fps = Number(fpsStr);
	if (mirrorXStr === "true" || mirrorXStr === "false")
		parsed.mirrorX = mirrorXStr === "true";
	if (mirrorYStr === "true" || mirrorYStr === "false")
		parsed.mirrorY = mirrorYStr === "true";

	return parsed;
}

function promptForJsonFile(): Promise<string> {
	const files = readdirSync(__dirname)
		.filter(
			(f) =>
				f.endsWith(".json") &&
				![
					"tsconfig.json",
					"package.json",
					"package-lock.json",
				].includes(f),
		)
		.sort();
	if (!files.length) throw new Error("No JSON files found in directory.");

	console.log("Available JSON files:");
	files.forEach((file, idx) => {
		const base = file.replace(/\.json$/, "");
		const name = base.split("--")[0]; // Only show name before settings
		console.log(`${idx + 1}: ${name}`);
	});

	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question("Select a file by number: ", (answer) => {
			const idx = parseInt(answer, 10) - 1;
			if (isNaN(idx) || idx < 0 || idx >= files.length) {
				console.log("Invalid selection.");
				process.exit(1);
			}
			rl.close();
			resolve(files[idx]);
		});
	});
}

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
				limitRefreshRateHz: 100,
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

				if (!frameData) {
					matrix.clear();
					return;
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
