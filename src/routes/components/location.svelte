<script lang="ts">
	import * as THREE from 'three';
	import { states } from '../states.svelte';
	import BoundingBox from './boundingbox.svelte';
	import Label from './label.svelte';

	let { data, onSelect = () => {} }: { data: any; onSelect: () => void } = $props();

	function handleSelect() {
		// Call the original onSelect function
		onSelect();

		// Access camera controls from states
		const controls = states.controls;
		if (!controls) return;

		// Create a bounding box based on the location's coordinates
		const coordinates = data.geometry.coordinates;
		const startHeight = data.geometry.start_height;
		const endHeight = data.geometry.height;

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

		// Update the current ID to this location's ID
		states.currentId = data.id;
	}
</script>

<BoundingBox
	coordinates={data.geometry.coordinates}
	startHeight={data.geometry.start_height}
	endHeight={data.geometry.height}
	onSelect={handleSelect}
/>

{#if data.name.en}
	<Label
		position={[
			data.geometry.coordinates.reduce((acc: number, curr: [number, number]) => acc + curr[0], 0) /
				data.geometry.coordinates.length,
			data.geometry.start_height + data.geometry.height + 5,
			data.geometry.coordinates.reduce((acc: number, curr: [number, number]) => acc + curr[1], 0) /
				data.geometry.coordinates.length
		]}
		number={data.id}
		imageUrl={data.images ? data.images[0] : ''}
		name={data.name.en}
	/>
{/if}
