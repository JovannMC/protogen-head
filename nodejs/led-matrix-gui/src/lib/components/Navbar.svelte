<script lang="ts">
	import Icon from "@iconify/svelte";

	import { panels, columns, rows, matrix } from "$lib/stores";
	import { invoke } from "@tauri-apps/api/core";
	import { open, save } from "@tauri-apps/plugin-dialog";

	// TODO: different cols/rows for each panel

	let previousValue = "1";

	function validateInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.value && parseInt(input.value) < 1)
			input.value = previousValue;
		else previousValue = input.value;
	}

	function finishInput(event: Event) {
		const input = event.target as HTMLInputElement;

		switch (input.id) {
			case "panels":
				panels.set(
					parseInt(input.value) || parseInt(input.placeholder),
				);
				break;
			case "cols":
				columns.set(
					parseInt(input.value) || parseInt(input.placeholder),
				);
				break;
			case "rows":
				rows.set(parseInt(input.value) || parseInt(input.placeholder));
				break;
		}
	}

    async function handleImport() {
        try {
            console.log("Opening file dialog for import...");
            const filePath = await open({
                multiple: false,
                directory: false,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (filePath) {
				console.log(`Importing data from ${filePath}`);
                const data = await invoke('import_data', { filePath });
                console.log(`Imported data: ${data}`);
            }
        } catch (err) {
            console.error(`Failed to import data: ${err}`);
        }
    }

    async function handleExport() {
        try {
            console.log("Opening file dialog for export...");
            const filePath = await save({
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (filePath) {
                const data = $matrix.toString();
                console.log(`Exporting data to ${filePath}`);
                await invoke('export_data', { filePath, data });
				console.log(`Exported data: ${data}`);
            }
        } catch (err) {
            console.error(`Failed to export data: ${err}`);
        }
    }
</script>

<div
	class="w-full h-12 bg-primary shadow-md z-10 flex items-center justify-between px-4"
>
	<div class="flex items-center space-x-4">
		<a href="/" class="text-secondary font-bold text-lg">LED Matrix</a>
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
			/>
		</div>
	</div>
	<div class="flex items-center justify-center gap-6">
		<button
			class="flex items-center justify-center hoverable-lg"
			onclick={handleImport}
		>
			<Icon icon="mdi:import" width={24} class="text-secondary" />
		</button>

		<button
			class="flex items-center justify-center hoverable-lg"
			onclick={handleExport}
		>
			<Icon icon="mdi:export" width={24} class="text-secondary" />
		</button>

		<a
			href="/settings"
			class="hover:rotate-180 transform transition-transform duration-300 hoverable-lg"
		>
			<Icon icon="mdi:settings" width={24} />
		</a>
	</div>
</div>
