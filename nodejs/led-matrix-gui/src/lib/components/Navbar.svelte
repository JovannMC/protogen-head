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
		type PanelFrames,
	} from "$lib/stores";
	import { invoke } from "@tauri-apps/api/core";
	import { open, save } from "@tauri-apps/plugin-dialog";
	import { getVersion } from "@tauri-apps/api/app";
	import { readFile } from "@tauri-apps/plugin-fs";
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
					const panelCount = data.length;

					const rowCount =
						data[0][$currentFrame]?.length || data[0][0]?.length;
					const colCount =
						data[0][$currentFrame]?.[0]?.length ||
						data[0][0]?.[0]?.length;
					const frameCount = data[0].length;

					console.log(
						`Detected ${frameCount} frames with dimensions: ${panelCount} panels, ${rowCount} rows, ${colCount} columns`,
					);

					panels.set(panelCount);
					panelsElement.value = panelCount.toString();
					columns.set(colCount);
					columnsElement.value = colCount.toString();
					rows.set(rowCount);
					rowsElement.value = rowCount.toString();

					matrix.set(data);
					totalFrames.set(frameCount);

					for (let i = 0; i < panelCount; i++) {
						setTimeout(() => {
							const panel = document.getElementById(`panel-${i}`);
							if (!panel) {
								console.error(
									`Could not find panel-${i} element`,
								);
								return;
							}

							const frameData =
								data[i][$currentFrame] || data[i][0];

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
				await invoke("export_data", { filePath, data });
				console.log(`Exported data: ${data}`);
			}
		} catch (err) {
			console.error(`Failed to export data: ${err}`);
		}
	}

	async function handleImageImport() {
		try {
			console.log("Opening file dialog for image import...");
			const filePath = await open({
				multiple: false,
				directory: false,
				filters: [
					{
						name: "Images",
						extensions: ["png", "jpg", "jpeg", "gif", "bmp"],
					},
				],
			});

			if (!filePath) return;

			console.log(`Importing image from ${filePath}`);

			const ext = (filePath as string).split(".").pop()?.toLowerCase();
			console.log(`Detected file extension: ${ext}`);

			try {
				// Handle GIFs differently to avoid base64 encoding large files
				if (ext === "gif") {
					console.log(
						"Detected GIF, using direct file path processing...",
					);

					try {
						// First get the total frame count using the file path directly
						const frameCountResponse = await invoke(
							"process_gif_from_path",
							{
								filePath,
								panelCount: $panels,
								rows: $rows,
								cols: $columns,
								getFrameCount: true,
							},
						);

						const frameInfo = JSON.parse(
							frameCountResponse as string,
						);
						const totalFrameCount = frameInfo.total_frames;
						console.log(`GIF has ${totalFrameCount} total frames`);

						// Pre-allocate matrix structure
						let newMatrix = [...$matrix];
						for (let i = 0; i < $panels; i++) {
							newMatrix[i] = Array(totalFrameCount);
						}

						// Use smaller chunks to reduce memory pressure
						const CHUNK_SIZE = 3;

						// Process in very small chunks to avoid memory issues
						for (
							let chunkStart = 0;
							chunkStart < totalFrameCount;
							chunkStart += CHUNK_SIZE
						) {
							const chunkEnd = Math.min(
								chunkStart + CHUNK_SIZE,
								totalFrameCount,
							);
							console.log(
								`Processing chunk ${chunkStart} to ${chunkEnd - 1}...`,
							);

							// Get data for this chunk using file path
							const chunkData = await invoke(
								"process_gif_from_path",
								{
									filePath,
									panelCount: $panels,
									rows: $rows,
									cols: $columns,
									chunkStart,
									chunkSize: CHUNK_SIZE,
								},
							);

							// Parse chunk data carefully
							const parsedChunk = JSON.parse(chunkData as string);

							// Process frames in this chunk
							for (let f = 0; f < parsedChunk.length; f++) {
								const frameIndex = chunkStart + f;

								// Process one panel at a time
								for (let i = 0; i < $panels; i++) {
									if (!parsedChunk[f][i]) continue;

									newMatrix[i][frameIndex] =
										parsedChunk[f][i];
								}
							}

							// Update the store less frequently to reduce memory pressure
							if (
								chunkStart % (CHUNK_SIZE * 5) === 0 ||
								chunkEnd === totalFrameCount
							) {
								console.log(
									`Updating matrix at chunk ${chunkStart}...`,
								);
								matrix.set(newMatrix);
								// Allow UI to refresh and garbage collection to run
								await new Promise((resolve) =>
									setTimeout(resolve, 100),
								);
							}
						}

						// Set the final state
						totalFrames.set(totalFrameCount);
						console.log(
							`Finished processing all ${totalFrameCount} frames`,
						);

						// Update displays for the current frame
						setTimeout(() => {
							for (let i = 0; i < $panels; i++) {
								const panel = document.getElementById(
									`panel-${i}`,
								);
								if (!panel) {
									console.error(
										`Could not find panel-${i} element`,
									);
									continue;
								}

								// Get data for the current frame from our processed matrix
								const frameData = newMatrix[i][$currentFrame];
								if (!frameData) {
									console.error(
										`No data for current frame ${$currentFrame}, panel ${i}`,
									);
									continue;
								}

								panel.dispatchEvent(
									new CustomEvent("update-matrix", {
										detail: {
											panelData: frameData,
										},
									}),
								);
							}
						}, 100);
					} catch (err) {
						console.error(`Error in GIF processing: ${err}`);
						throw err;
					}
				} else {
					// For non-GIF images, use normal base64 approach
					const binary = await readFile(filePath as string);
					console.log(`Read ${binary.length} bytes from file`);

					let base64Data;
					// For large non-GIF files, use chunked encoding to avoid stack overflow
					if (binary.length > 1000000) {
						// Over 1MB
						console.log(
							"Large file detected, using chunked encoding",
						);
						const chunkSize = 512 * 1024; // 512KB chunks
						let chunks = [];

						for (let i = 0; i < binary.length; i += chunkSize) {
							const chunk = binary.slice(i, i + chunkSize);
							chunks.push(
								String.fromCharCode.apply(null, [...chunk]),
							);
						}

						base64Data = `data:image/${ext};base64,${btoa(chunks.join(""))}`;
					} else {
						// For smaller files, use the original approach
						base64Data = `data:image/${ext};base64,${btoa(String.fromCharCode(...binary))}`;
					}

					// Existing code for non-GIF images
					const panelsData = await invoke("decode_image", {
						base64Data,
						panelCount: $panels,
						rows: $rows,
						cols: $columns,
					});

					const data = JSON.parse(panelsData as string);

					// Rest of your non-GIF code stays the same
					const convertedData = data.map((panel: LEDMatrix) => {
						return panel.map((row) => {
							return row.map((pixel) => {
								if (
									Array.isArray(pixel) &&
									pixel.length === 3
								) {
									const [r, g, b] = pixel;
									return (r << 16) | (g << 8) | b;
								}
								return pixel;
							});
						});
					});

					matrix.update((existingMatrix) => {
						const newMatrix = [...existingMatrix];
						for (let i = 0; i < $panels; i++) {
							if (!newMatrix[i]) newMatrix[i] = [];
							newMatrix[i][$currentFrame] = convertedData[i];
						}
						return newMatrix;
					});

					// update displays for each panel
					setTimeout(() => {
						for (let i = 0; i < $panels; i++) {
							const panel = document.getElementById(`panel-${i}`);
							if (!panel) {
								console.error(
									`Could not find panel-${i} element`,
								);
								continue;
							}
							panel.dispatchEvent(
								new CustomEvent("update-matrix", {
									detail: {
										panelData: convertedData[i],
									},
								}),
							);
						}
					}, 100);
				}
			} catch (err) {
				console.error(`Failed to decode image: ${err}`);
			}
		} catch (err) {
			console.error(`Failed to import image: ${err}`);
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

		<button
			class="flex items-center justify-center hoverable-lg"
			onclick={handleImageImport}
			title="Import from Image"
		>
			<Icon icon="mdi:image" width={24} />
		</button>

		<a href="/about" class="hoverable-lg">
			<Icon icon="mdi:info" width={24} />
		</a>
	</div>
</div>
