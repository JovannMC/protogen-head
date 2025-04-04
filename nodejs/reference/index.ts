import { LedMatrix, GpioMapping } from "rpi-led-matrix";

const wait = (t: number) => new Promise((ok) => setTimeout(ok, t));

try {
	const matrix = new LedMatrix(
		{
			...LedMatrix.defaultMatrixOptions(),
			rows: 32,
			cols: 64,
			chainLength: 2,
			hardwareMapping: GpioMapping.AdafruitHat,
			showRefreshRate: true,
		},
		{
			...LedMatrix.defaultRuntimeOptions(),
			gpioSlowdown: 1,
		},
	);

	matrix
		.clear() // clear the display
		.brightness(100) // set the panel brightness to 100%
		.fgColor(0x0000ff) // set the active color to blue
		.fill() // color the entire diplay blue
		.fgColor(0xffff00) // set the active color to yellow
		// draw a yellow circle around the display
		.drawCircle(
			matrix.width() / 2,
			matrix.height() / 2,
			matrix.width() / 2 - 1,
		)
		// draw a yellow rectangle
		.drawRect(
			matrix.width() / 4,
			matrix.height() / 4,
			matrix.width() / 2,
			matrix.height() / 2,
		)
		// sets the active color to red
		.fgColor({ r: 255, g: 0, b: 0 })
		// draw two diagonal red lines connecting the corners
		.drawLine(0, 0, matrix.width(), matrix.height())
		.drawLine(matrix.width() - 1, 0, 0, matrix.height() - 1);

	matrix.sync();

	// Handle keyboard interrupt (Ctrl+C)
	process.on("SIGINT", () => {
        console.log("bai lmao");
		matrix.clear();
		matrix.sync();
		process.exit();
	});

	await wait(999999);
} catch (error) {
	console.error(`${__filename} caught: `, error);
}
