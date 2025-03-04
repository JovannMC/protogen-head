import { writable, type Writable } from "svelte/store";

export const panels = writable(1);
export const columns = writable(64);
export const rows = writable(32);

export const currentColor = writable("#ffffff");
export const currentTool: Writable<Tool> = writable("pen");
export const currentAnimation: Writable<Animation> = writable("none");
export const currentFrame = writable(0);
export const selectedFPS = writable(30);

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
	"#000000",
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
