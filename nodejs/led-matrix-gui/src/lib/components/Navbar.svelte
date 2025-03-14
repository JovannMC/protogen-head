<script lang="ts">
	import Icon from "@iconify/svelte";

	import {
		panels,
		columns,
		rows,
		matrix,
		currentFrame,
		type MatrixData,
		totalFrames,
		type LEDMatrix,
	} from "$lib/stores";
	import { invoke } from "@tauri-apps/api/core";
	import { open, save } from "@tauri-apps/plugin-dialog";
	import { getVersion } from "@tauri-apps/api/app";
	import { onMount } from "svelte";

	// TODO: different cols/rows for each panel

	let panelsElement: HTMLInputElement;
	let columnsElement: HTMLInputElement;
	let rowsElement: HTMLInputElement;
	let previousValue = "1";

	function validateInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.value && +input.value < 1) input.value = previousValue;
		else previousValue = input.value;
	}

	function finishInput(event: Event) {
		const input = event.target as HTMLInputElement;

		switch (input.id) {
			case "panels":
				panels.set(+input.value || +input.placeholder);
				break;
			case "cols":
				columns.set(+input.value || +input.placeholder);
				break;
			case "rows":
				rows.set(+input.value || +input.placeholder);
				break;
		}
	}

	async function handleImport() {
		try {
			console.log("Opening file dialog for import...");
			const filePath = await open({
				multiple: false,
				directory: false,
				filters: [{ name: "JSON", extensions: ["json"] }],
			});
			if (filePath) {
				console.log(`Importing data from ${filePath}`);
				const data: MatrixData = JSON.parse(
					await invoke("import_data", { filePath }),
				);
				if (data) {
					console.log(
						`Imported data: ${JSON.stringify(data).slice(0, 100)}...`,
					);

					const panelCount = data.length;

					// Get dimensions from the first frame of the first panel
					const rowCount =
						data[0][$currentFrame]?.length || data[0][0]?.length;
					const colCount =
						data[0][$currentFrame]?.[0]?.length ||
						data[0][0]?.[0]?.length;
					const frameCount = data[0].length;

					console.log(
						`Detected ${frameCount} frames with dimensions: ${panelCount} panels, ${rowCount} rows, ${colCount} columns`,
					);

					// Update matrix settings
					panels.set(panelCount);
					panelsElement.value = panelCount.toString();
					columns.set(colCount);
					columnsElement.value = colCount.toString();
					rows.set(rowCount);
					rowsElement.value = rowCount.toString();

					// Set the entire matrix data & frames
					matrix.set(data);
					totalFrames.set(frameCount);

					// Update each panel's display
					for (let i = 0; i < panelCount; i++) {
						// Use setTimeout to allow time for matrix to be re-rendered
						setTimeout(() => {
							const panel = document.getElementById(`panel-${i}`);
							if (!panel) {
								console.error(
									`Could not find panel-${i} element`,
								);
								return;
							}

							// Send the current frame's data to the panel
							const frameData =
								data[i][$currentFrame] || data[i][0];
							console.log(
								`Dispatching update-matrix event for panel ${i}, frame ${$currentFrame}`,
							);

							panel.dispatchEvent(
								new CustomEvent("update-matrix", {
									detail: {
										panelData: frameData,
									},
								}),
							);
						}, 100);
					}
				}
			}
		} catch (err) {
			console.error(`Failed to import data: ${err}`);
		}
	}
	async function handleExport() {
		try {
			console.log("Opening file dialog for export...");
			const filePath = await save({
				filters: [{ name: "JSON", extensions: ["json"] }],
			});
			if (filePath) {
				const matrixData = $matrix.map((panel) => {
					const paddedPanel = [...panel];
					while (paddedPanel.length < $totalFrames) {
						paddedPanel.push(null as unknown as LEDMatrix);
					}
					return paddedPanel;
				});

				const data = JSON.stringify(
					matrixData,
					(_, value) => {
						if (
							Array.isArray(value) &&
							typeof value[0] === "number"
						) {
							return JSON.stringify(value);
						}
						return value;
					},
					2,
				).replace(/"\[(.*?)\]"/g, "[$1]");
				console.log(`Exporting data to ${filePath}`);
				await invoke("export_data", { filePath, data });
				console.log(`Exported data: ${data}`);
			}
		} catch (err) {
			console.error(`Failed to export data: ${err}`);
		}
	}

	onMount(async () => {
		try {
			const version = await getVersion();
			const versionElement = document.getElementById("version");
			if (versionElement) versionElement.textContent = `v${version}`;
		} catch (err) {
			console.error(`Failed to get version: ${err}`);
		}
	});
</script>

<div
	class="w-full h-12 bg-primary shadow-md z-10 flex items-center justify-between px-4"
>
	<div class="flex items-center gap-2">
		<a href="/" class="text-secondary font-bold text-lg">LED Matrix</a>
		<span class="text-secondary text-sm" id="version">v0.0.0</span>
	</div>
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<label for="panels" class="text-sm text-secondary">Panels:</label>
			<input
				type="number"
				id="panels"
				class="w-16 h-8"
				placeholder="1"
				min="1"
				oninput={validateInput}
				onchange={finishInput}
				bind:this={panelsElement}
			/>
		</div>
		<div class="flex items-center gap-2">
			<label for="cols" class="text-sm text-secondary">Cols:</label>
			<input
				type="number"
				id="cols"
				class="w-16 h-8"
				placeholder="64"
				min="1"
				oninput={validateInput}
				onchange={finishInput}
				bind:this={columnsElement}
			/>
		</div>
		<div class="flex items-center gap-2">
			<label for="rows" class="text-sm text-secondary">Rows:</label>
			<input
				type="number"
				id="rows"
				class="w-16 h-8"
				placeholder="32"
				min="1"
				oninput={validateInput}
				onchange={finishInput}
				onkeydown={(event) => {
					if (event.key === "Enter") finishInput(event);
				}}
				bind:this={rowsElement}
			/>
		</div>
	</div>
	<div class="flex items-center justify-center gap-6">
		<button
			class="flex items-center justify-center hoverable-lg"
			onclick={handleImport}
		>
			<Icon icon="mdi:import" width={24} />
		</button>

		<button
			class="flex items-center justify-center hoverable-lg"
			onclick={handleExport}
		>
			<Icon icon="mdi:content-save" width={24} />
		</button>

		<a href="/about" class="hoverable-lg">
			<Icon icon="mdi:info" width={24} />
		</a>
	</div>
</div>
