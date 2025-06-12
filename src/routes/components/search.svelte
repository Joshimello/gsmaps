<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import * as THREE from 'three';
	import data from '$lib/data';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { states } from '../states.svelte';

	let searchValue = $state('');

	const filteredLocations = $derived(
		(() => {
			if (!searchValue.trim()) return data.locations.slice(0, 8); // Show first 8 when no search

			return data.locations
				.filter((location) => {
					const searchTerm = searchValue.toLowerCase();
					return (
						location.name.en.toLowerCase().includes(searchTerm) ||
						location.name.cn.toLowerCase().includes(searchTerm) ||
						location.description.en.toLowerCase().includes(searchTerm) ||
						location.description.cn.toLowerCase().includes(searchTerm) ||
						location.type.toLowerCase().includes(searchTerm)
					);
				})
				.slice(0, 8); // Limit results to 8
		})()
	);

	function selectLocation(locationId: number) {
		const location = data.locations.find((l) => l.id === locationId);
		if (!location) return;

		// Move camera to location
		moveCameraToLocation(location);
		
		states.currentId = locationId;
		searchValue = '';
	}

	function moveCameraToLocation(location: any) {
		// Access camera controls from states
		const controls = states.controls;
		if (!controls) return;

		// Create a bounding box based on the location's coordinates
		const coordinates = location.geometry.coordinates;
		const startHeight = location.geometry.start_height;
		const endHeight = location.geometry.height;

		// Create a box3 to represent the bounding box
		const box = new THREE.Box3();

		// Add all corner points to the box
		coordinates.forEach((coord: [number, number]) => {
			// Add bottom point
			box.expandByPoint(new THREE.Vector3(coord[0], startHeight, coord[1]));
			// Add top point
			box.expandByPoint(new THREE.Vector3(coord[0], startHeight + endHeight, coord[1]));
		});

		// Calculate center of the bounding box
		const center = new THREE.Vector3();
		box.getCenter(center);

		// Calculate box size
		const size = new THREE.Vector3();
		box.getSize(size);

		// Determine distance needed to view the entire box at a 60-degree angle
		const distance = Math.max(size.x, size.y, size.z) * 1.5;

		// Position camera at desired angle and distance
		const theta = Math.PI / 3; // 60 degrees
		const phi = Math.PI / 4; // 45 degrees azimuth

		// Calculate camera position
		const cameraX = center.x + distance * Math.sin(theta) * Math.cos(phi);
		const cameraY = center.y + distance * Math.cos(theta);
		const cameraZ = center.z + distance * Math.sin(theta) * Math.sin(phi);

		// Set camera position and target
		controls.setLookAt(cameraX, cameraY, cameraZ, center.x, center.y, center.z, true);
	}
</script>

<Command.Root class="rounded-lg border shadow-md">
	<Command.Input placeholder="Search locations..." bind:value={searchValue} />
	<Command.List>
		<Command.Empty>No locations found.</Command.Empty>

		{#if filteredLocations.length > 0}
			<Command.Group heading="Locations">
				{#each filteredLocations as location (location.id)}
					<Command.Item onSelect={() => selectLocation(location.id)} class="cursor-pointer">
						<MapPinIcon class="mr-2 h-4 w-4" />
						<div class="flex flex-col">
							<div class="flex items-center gap-2">
								<span class="font-medium">{location.name.en}</span>
							</div>
							<span class="text-xs text-muted-foreground">{location.description.en}</span>
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if searchValue.trim() && filteredLocations.length === 0}
			<Command.Group heading="Actions">
				<Command.Item disabled>
					<SearchIcon class="mr-2 h-4 w-4" />
					<span>No locations match "{searchValue}"</span>
				</Command.Item>
			</Command.Group>
		{/if}
	</Command.List>
</Command.Root>
