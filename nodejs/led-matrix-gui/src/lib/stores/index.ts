import { writable, type Writable } from "svelte/store";

export const panels = writable(1);
export const columns = writable(64);
export const rows = writable(32);

export const isDrawingMatrix = writable(false);
export const matrix = writable<MatrixData>([
	[
		Array(32)
			.fill(0)
			.map(() => Array(64).fill(0)),
	],
]);

export const matrixHistory = writable<historyEntry[]>([
	[
		0,
		[
			[
				Array(32)
					.fill(0)
					.map(() => Array(64).fill(0)),
			],
		],
	],
]);

export const currentColor = writable("#ffffff");
export const currentTool: Writable<Tool> = writable("pen");
export const currentToolSize = writable(1);
export const currentAnimation: Writable<Animation> = writable("none");
export const currentFrame = writable(0);
export const totalFrames = writable(120);
export const selectedFPS = writable(30);
export const interpolate = writable(true);
export const interpolationType = writable("linear");

export type LEDMatrix = number[][]; // A single 2D grid of LEDs
export type PanelFrames = LEDMatrix[]; // All frames for a single panel
export type MatrixData = PanelFrames[]; // All panels
export type historyEntry = [number, MatrixData];

export type Tool =
	| "pen"
	| "line"
	| "rectangle"
	| "ellipse"
	| "eraser"
	| "fill"
	| "picker";
export type Animation = "none" | "fade" | "scroll";

export const defaultColors = [
	"#FF0000",
	"#00FF00",
	"#0000FF",
	"#FFFF00",
	"#FF00FF",
	"#00FFFF",
	"#FFFFFF",
	"transparent",
];

export const tools: Tool[] = [
	"pen",
	"line",
	"rectangle",
	"ellipse",
	"eraser",
	"fill",
	"picker",
];

export const animations: Animation[] = ["none", "fade", "scroll"];
