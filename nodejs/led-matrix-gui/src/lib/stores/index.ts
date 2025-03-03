import { writable } from "svelte/store";

export const panels = writable(1);
export const columns = writable(64);
export const rows = writable(32);

export const color = writable("#ffffff");
export const tool = writable("pen");
export const animation = writable("none");
export const frame = writable(0);
export const fps = writable(30);
