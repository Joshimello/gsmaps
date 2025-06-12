<script>
	import { Switch } from '$lib/components/ui/switch';
	import data from '$lib/data';
	import { Canvas } from '@threlte/core';
	import CurrentInfo from './components/current-info.svelte';
	import OmniRenderer from './components/omni-renderer.svelte';
	import Scene from './components/scene.svelte';
	import Search from './components/search.svelte';
	import { states } from './states.svelte';
	import { X } from '@lucide/svelte';

	const currentLocation = $derived(data.locations.find((l) => l.id === states.currentId));
	const isNavigationActive = $derived(states.navigationPath.length > 0);

	function clearNavigation() {
		states.navigationPath = [];
	}
</script>

<div class="fixed left-8 top-8 z-10 flex items-center gap-2">
	<Switch bind:checked={() => states.mode == 'omni', (v) => (states.mode = v ? 'omni' : 'three')} />
	{states.mode}
</div>

{#if isNavigationActive}
	<div class="fixed left-8 top-20 z-10">
		<div class="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800 shadow-md">
			<span>🧭 Navigation Active</span>
			<button 
				onclick={clearNavigation}
				class="rounded-full p-1 hover:bg-green-200 transition-colors"
			>
				<X size={14} />
			</button>
		</div>
	</div>
{/if}

<div class="fixed bottom-8 left-8 z-10">
	{#if states.currentId && currentLocation}
		<CurrentInfo locationData={currentLocation} onClose={() => (states.currentId = 0)} />
	{/if}
</div>

<div class="fixed right-8 top-8 z-10">
	<Search />
</div>

<div class="absolute h-screen w-full">
	<Canvas renderMode="always">
		<Scene />
	</Canvas>
</div>

<div class="absolute -z-10 h-screen w-full">
	<OmniRenderer hidden={states.mode != 'omni'} />
</div>
