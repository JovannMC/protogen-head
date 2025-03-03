<script lang="ts">
	import Matrix from "$lib/components/Matrix.svelte";
	import * as Panel from "$lib/components/panels";

</script>

<div class="flex w-full h-full">
    <div class="w-16 h-full p-1">
        <Panel.Tool />
    </div>
    
    <div class="flex-1 flex flex-col">
        <div class="flex-1 flex items-center justify-center">
            <div class="bg-primary p-2 rounded-lg">
                <Matrix />
            </div>
        </div>
        
        <div class="w-full h-24 p-1">
            <Panel.Animation />
        </div>
    </div>
    
    <div class="w-16 h-full p-1">
        <Panel.Color />
    </div>
</div>