<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import data from '$lib/data';
	import { Clock, ExternalLink, MapPin, Navigation, X } from '@lucide/svelte';
	import * as THREE from 'three';
	import { states } from '../states.svelte';
	import { navigation, type Node } from './navigation';

	type LocationData = (typeof data.locations)[number] & {
		images?: string[];
		maps_url?: string;
	};

	let {
		locationData,
		onClose = () => {}
	}: {
		locationData: LocationData;
		onClose: () => void;
	} = $props();

	let dialogOpen = $state(false);
	let searchValue = $state('');
	let selectedStartLocation: LocationData | null = $state(null);

	const filteredLocations = $derived(
		(() => {
			if (!searchValue.trim()) return data.locations.slice(0, 8);

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
				.slice(0, 8);
		})()
	);

	function formatType(type: string) {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	function openNavigationDialog() {
		dialogOpen = true;
		searchValue = '';
		selectedStartLocation = null;
	}

	function selectStartLocation(location: LocationData) {
		selectedStartLocation = location;
		searchValue = '';
	}

	function startNavigation() {
		if (!selectedStartLocation) return;

		// Find nodes that contain these locations
		const startNode = findNodeByLocationId(selectedStartLocation.id);
		const endNode = findNodeByLocationId(locationData.id);

		if (!startNode || !endNode) {
			console.error('Could not find navigation nodes for selected locations');
			return;
		}

		// Calculate navigation path
		const result = navigation([startNode, endNode]);

		if (result.nodes.length > 0) {
			// Update navigation state and move camera
			states.navigationPath = result.pathIds;
			moveCameraToPath(result.nodes);
			console.log(
				'Navigation started from',
				selectedStartLocation.name.en,
				'to',
				locationData.name.en
			);
		}

		dialogOpen = false;
	}

	function findNodeByLocationId(locationId: number): Node | null {
		// Find the building/location data
		const location = data.locations.find((loc) => loc.id === locationId);
		if (!location) return null;

		// Calculate center point of the building
		const coordinates = location.geometry.coordinates;
		const centerX = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
		const centerZ = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
		const centerY = location.geometry.start_height + location.geometry.height / 2;

		let closestNode: Node | null = null;
		let minDistance = Infinity;

		// Find the closest navigation node to this building
		for (const [nodeId, node] of Object.entries(data.navigation.nodes)) {
			const nodeCoords = node.coordinates;
			const distance = Math.sqrt(
				Math.pow(nodeCoords[0] - centerX, 2) +
					Math.pow(nodeCoords[1] - centerY, 2) +
					Math.pow(nodeCoords[2] - centerZ, 2)
			);

			if (distance < minDistance) {
				minDistance = distance;
				closestNode = node;
			}
		}

		return closestNode;
	}

	function highlightPath(nodes: Node[]) {
		// Update the global navigation state with the path IDs
		const result = navigation([
			findNodeByLocationId(selectedStartLocation!.id)!,
			findNodeByLocationId(locationData.id)!
		]);
		states.navigationPath = result.pathIds;
		console.log('Navigation path set:', result.pathIds);
	}

	function moveCameraToPath(nodes: Node[]) {
		const controls = states.controls;
		if (!controls || nodes.length === 0) return;

		// Calculate bounding box of all nodes in the path
		const box = new THREE.Box3();

		nodes.forEach((node) => {
			const coord = node.coordinates;
			box.expandByPoint(new THREE.Vector3(coord[0], coord[1], coord[2]));
		});

		// Calculate center and size
		const center = new THREE.Vector3();
		box.getCenter(center);

		const size = new THREE.Vector3();
		box.getSize(size);

		// Position camera above the path for top-down view
		const maxDimension = Math.max(size.x, size.z);
		const cameraHeight = center.y + maxDimension * 1.2;

		// Set camera to look down at the path
		controls.setLookAt(center.x, cameraHeight, center.z, center.x, center.y, center.z, true);
	}
</script>

<div class="flex flex-col gap-2">
	<div class="max-w-[400px] overflow-hidden rounded-lg bg-white shadow-lg">
		<!-- Header with close button -->
		<div class="flex items-center justify-between border-b p-3">
			<div class="text-sm font-medium text-gray-600">Location Details</div>
			<button class="rounded-full p-1 transition-colors hover:bg-gray-100" onclick={onClose}>
				<X size={16} />
			</button>
		</div>

		<!-- Image carousel -->
		{#if locationData.images && locationData.images.length > 0}
			<div class="relative h-48 bg-gray-100">
				<img
					src={locationData.images[0]}
					alt={locationData.name.en}
					class="h-full w-full object-cover"
				/>
				{#if locationData.images.length > 1}
					<div
						class="absolute bottom-2 right-2 rounded bg-black bg-opacity-60 px-2 py-1 text-xs text-white"
					>
						1 / {locationData.images.length}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Content -->
		<div class="space-y-4 p-4">
			<!-- Location title and type -->
			<div class="space-y-2">
				<div class="flex items-start gap-3">
					<div class="flex-1">
						<h2 class="text-xl font-bold text-gray-900">{locationData.name.en}</h2>
						{#if locationData.name.cn && locationData.name.cn !== locationData.name.en}
							<p class="text-sm text-gray-600">{locationData.name.cn}</p>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-2">
					<span
						class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
					>
						{formatType(locationData.type)}
					</span>
				</div>
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<h3 class="text-sm font-semibold text-gray-900">About</h3>
				<p class="text-sm leading-relaxed text-gray-700">{locationData.description.en}</p>
				{#if locationData.description.cn && locationData.description.cn !== locationData.description.en}
					<p class="text-sm leading-relaxed text-gray-600">{locationData.description.cn}</p>
				{/if}
			</div>

			<!-- Quick info -->
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-gray-900">Information</h3>

				<div class="space-y-2">
					<div class="flex items-center gap-3 text-sm">
						<MapPin size={16} class="flex-shrink-0 text-gray-500" />
						<span class="text-gray-700">Location ID: {locationData.id}</span>
					</div>

					{#if locationData.type === 'restaurant'}
						<div class="flex items-center gap-3 text-sm">
							<Clock size={16} class="flex-shrink-0 text-gray-500" />
							<span class="text-gray-700">Dining available</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="space-y-2 border-t pt-2">
				{#if locationData.maps_url}
					<a
						href={locationData.maps_url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
					>
						<ExternalLink size={16} />
						View on Google Maps
					</a>
				{/if}

				<button
					onclick={openNavigationDialog}
					class="flex w-full items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
				>
					<Navigation size={16} />
					Navigate
				</button>
			</div>

			<!-- Additional images grid -->
			{#if locationData.images && locationData.images.length > 1}
				<div class="space-y-2 border-t pt-2">
					<h3 class="text-sm font-semibold text-gray-900">Photos</h3>
					<div class="grid grid-cols-3 gap-2">
						{#each locationData.images.slice(1, 4) as image, index}
							<div class="aspect-square overflow-hidden rounded-lg bg-gray-100">
								<img
									src={image}
									alt={`${locationData.name.en} photo ${index + 2}`}
									class="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
								/>
							</div>
						{/each}
					</div>
					{#if locationData.images.length > 4}
						<button class="text-xs text-blue-600 hover:underline">
							View all {locationData.images.length} photos
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Navigation Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Portal>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Navigate to {locationData.name.en}</Dialog.Title>
				<Dialog.Description>Select your starting location to get directions.</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				<Command.Root class="rounded-lg border">
					<Command.Input placeholder="Search starting location..." bind:value={searchValue} />
					<Command.List>
						<Command.Empty>No locations found.</Command.Empty>

						{#if filteredLocations.length > 0}
							<Command.Group heading="Select Starting Location">
								{#each filteredLocations as location (location.id)}
									<Command.Item
										onSelect={() => selectStartLocation(location)}
										class="cursor-pointer"
										data-selected={selectedStartLocation?.id === location.id}
									>
										<MapPin class="mr-2 h-4 w-4" />
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<span class="font-medium">{location.name.en}</span>
												{#if location.name.cn !== location.name.en}
													<span class="text-sm text-muted-foreground">({location.name.cn})</span>
												{/if}
											</div>
											<span class="text-xs text-muted-foreground">{location.description.en}</span>
										</div>
									</Command.Item>
								{/each}
							</Command.Group>
						{/if}
					</Command.List>
				</Command.Root>

				{#if selectedStartLocation}
					<div class="rounded-lg bg-green-50 p-3">
						<div class="text-sm font-medium text-green-800">Selected Start Location:</div>
						<div class="text-sm text-green-700">{selectedStartLocation.name.en}</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Dialog.Close>Cancel</Dialog.Close>
				<button
					onclick={startNavigation}
					disabled={!selectedStartLocation}
					class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
				>
					Start Navigation
				</button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
