<script lang="ts">
	import data from '$lib/data';
	import { T } from '@threlte/core';
	import { interactivity } from '@threlte/extras';
	import { states } from '../states.svelte';
	import Camera from './camera.svelte';
	import Location from './location.svelte';
	import { navigation, type Node, pickTwoRandomNodes } from './navigation';
	import Roads from './roads.svelte';

	interactivity();

	let randomNodes: Node[] = [];
	let colorNodes: Node[] = [];

	// Use navigation path from states, fallback to random path for demo
	const pathIds = $derived(states.navigationPath.length > 0 ? states.navigationPath : []);

	function generateNewPath() {
		randomNodes = pickTwoRandomNodes();
		const navigationResult = navigation(randomNodes);
		colorNodes = navigationResult.nodes;
		// Set the navigation path in states for the slider to use
		states.navigationPath = navigationResult.pathIds;
		console.log('Generated demo navigation path:', navigationResult.pathIds);
	}

	// Generate initial path for demo
	generateNewPath();

	// Listen for demo path generation events
	if (typeof window !== 'undefined') {
		window.addEventListener('generateDemoPath', generateNewPath);
	}
</script>

{#if states.mode == 'three'}
	<T.Group rotation={[-Math.PI / 2, 0, 0]} scale={[100, 100, 100]} position={[0, -20, 20]}>
		<SplatRenderer />
	</T.Group>
{/if}

{#each data.locations as location}
	<Location
		data={location}
		onSelect={() => {
			states.currentId = location.id;
		}}
	/>
{/each}

<!-- Add lighting for better material rendering -->
<T.DirectionalLight position={[10, 10, 5]} intensity={0.8} />
<T.AmbientLight intensity={0.4} />

<!-- Render roads -->
<Roads defaultColor="#666666" highlightedPath={pathIds} highlightColor="#ff6b35" />

<!-- Render navigation nodes -->
<!-- <T.Group>
	{#each colorNodes as colorNode}
		<T.Mesh
			position={[colorNode.locations[0], colorNode.locations[2] - 40, colorNode.locations[1]]}
		>
			<T.SphereGeometry args={[0.6, 8, 8]} />
			<T.MeshBasicMaterial color="red" />
		</T.Mesh>
	{/each}
	{#each Object.values(data.navigation.nodes) as node}
		<T.Mesh position={[node.coordinates[0], node.coordinates[2] - 40, node.coordinates[1]]}>
			<T.SphereGeometry args={[0.5, 4, 4]} />
			<T.MeshBasicMaterial />
		</T.Mesh>
	{/each}
</T.Group> -->

<Camera bind:controls={states.controls} />
