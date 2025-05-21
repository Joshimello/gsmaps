<script lang="ts">
	import data from '$lib/data';
	import { interactivity } from '@threlte/extras';
	import { states } from '../states.svelte';
	import Camera from './camera.svelte';
	import Location from './location.svelte';

	interactivity();

	type Node = {
		id: string;
		locations: number[];
		edges: number[];
	};
	let randomNodes: Node[] = [];
	let colorNodes: Node[] = [];

	class PriorityQueue<T> {
		private elements: { item: T; priority: number }[] = [];

		enqueue(item: T, priority: number): void {
			this.elements.push({ item, priority });
			this.elements.sort((a, b) => a.priority - b.priority);
		}

		dequeue(): T | undefined {
			return this.elements.shift()?.item;
		}

		isEmpty(): boolean {
			return this.elements.length === 0;
		}
	}

	function pickTwoRandomNodes() {
		const nodes = Object.values(data.navigation.nodes);
		if (nodes.length < 2) return;

		const index1 = Math.floor(Math.random() * nodes.length);
		let index2 = Math.floor(Math.random() * nodes.length);

		// Ensure index2 is different
		while (index2 === index1) {
			index2 = Math.floor(Math.random() * nodes.length);
		}

		randomNodes = [nodes[index1], nodes[index2]];
	}

	function navigation() {
		const nodes = data.navigation.nodes;
		const edges = data.navigation.edges;

		const startId = Object.keys(nodes).find((id) => nodes[id] === randomNodes[0]);
		const endId = Object.keys(nodes).find((id) => nodes[id] === randomNodes[1]);

		if (!startId || !endId) return;

		const distances: Record<string, number> = {};
		const prev: Record<string, string | null> = {};
		const pq = new PriorityQueue<string>();

		for (const nodeId in nodes) {
			distances[nodeId] = Infinity;
			prev[nodeId] = null;
		}

		distances[startId] = 0;
		pq.enqueue(startId, 0);

		while (!pq.isEmpty()) {
			const current = pq.dequeue();
			if (current === undefined) continue;

			if (current === endId) break;

			// Find edges connected to current node
			for (const [edgeId, edge] of Object.entries(edges)) {
				const [a, b] = edge.node;
				const neighbor = a === current ? b : b === current ? a : null;
				if (!neighbor) continue;

				const currentCoord = nodes[current as string].coordinates;
				const neighborCoord = nodes[neighbor].coordinates;
				const distance = Math.sqrt(
					currentCoord.reduce((sum, val, i) => sum + (val - neighborCoord[i]) ** 2, 0)
				);

				const alt = distances[current] + distance;
				if (alt < distances[neighbor]) {
					distances[neighbor] = alt;
					prev[neighbor] = current;
					pq.enqueue(neighbor, alt);
				}
			}
		}

		// Optional: reconstruct path
		const path = [];
		let curr: string | null = endId;
		while (curr) {
			colorNodes.push(data.navigation.nodes[curr]);
			path.unshift(curr);
			curr = prev[curr];
		}
		console.log('Shortest path:', path);
	}

	pickTwoRandomNodes();
	navigation();
</script>

<!-- {#if states.mode == 'three'}
	<T.Group rotation={[-Math.PI / 2, 0, 0]} scale={[20, 20, 20]} position={[1.5, -6, -1]}>
		<SplatRenderer />
	</T.Group>
{/if} -->

{#each data.locations as location}
	<Location
		data={location}
		onSelect={() => {
			states.currentId = location.id;
		}}
	/>
{/each}

<T.Group>
	{#each colorNodes as colorNode}
		<T.Mesh
			position={[colorNode.coordinates[0], colorNode.coordinates[2] - 7, colorNode.coordinates[1]]}
		>
			<T.SphereGeometry args={[0.6, 8, 8]} />
			<T.MeshBasicMaterial color="red" />
		</T.Mesh>
	{/each}
	{#each Object.values(data.navigation.nodes) as node}
		<T.Mesh position={[node.coordinates[0], node.coordinates[2] - 7, node.coordinates[1]]}>
			<T.SphereGeometry args={[0.5, 4, 4]} />
			<T.MeshBasicMaterial />
		</T.Mesh>
	{/each}
</T.Group> -->

<Camera bind:controls={states.controls} />
