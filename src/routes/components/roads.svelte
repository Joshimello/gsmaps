<script lang="ts">
	import data from '$lib/data';
	import { T } from '@threlte/core';
	import { MeshLineGeometry, MeshLineMaterial } from '@threlte/extras';
	import { BufferGeometry, Vector3 } from 'three';

	let {
		defaultColor = '#666666',
		highlightedPath = [],
		highlightColor = '#ff4444'
	}: { defaultColor: string; highlightedPath: string[]; highlightColor: string } = $props();

	// Road type styling
	const roadStyles: Record<string, { color: string }> = {
		service: { color: '#888888' },
		footway: { color: '#aaaaaa' },
		residential: { color: '#666666' },
		primary: { color: '#444444' },
		secondary: { color: '#555555' },
		default: { color: defaultColor }
	};

	function createSimpleRoads() {
		const roads = [];
		const highlightedRoads = [];
		let skippedNodes = 0;

		for (const edge of data.navigation.edges) {
			const [nodeId1, nodeId2] = edge.node;
			const node1 = data.navigation.nodes[nodeId1];
			const node2 = data.navigation.nodes[nodeId2];

			if (!node1 || !node2) {
				skippedNodes++;
				continue;
			}

			// Check if this edge is part of the highlighted path
			const isHighlighted = isEdgeInPath(nodeId1, nodeId2, highlightedPath);

			// Debug first few highlighted edges
			if (isHighlighted && highlightedRoads.length < 3) {
				console.log(`Found highlighted edge: ${nodeId1} -> ${nodeId2}`);
			}

			// Create points for the line
			const points = [
				new Vector3(node1.coordinates[0], node1.coordinates[2] - 10, node1.coordinates[1]),
				new Vector3(node2.coordinates[0], node2.coordinates[2] - 10, node2.coordinates[1])
			];

			const roadType = data.navigation.info[edge.info_id]?.type || 'default';
			const style = roadStyles[roadType] || roadStyles.default;

			if (isHighlighted) {
				// Store points for MeshLineGeometry
				const highlightedRoad = {
					points,
					roadType,
					isHighlighted: true,
					color: highlightColor,
					isThick: true
				};

				highlightedRoads.push(highlightedRoad);

				// Debug MeshLine creation
				if (highlightedRoads.length <= 3) {
					console.log(`Created MeshLine for edge ${nodeId1}-${nodeId2}:`, {
						color: highlightColor,
						points: points.map((p) => [p.x, p.y, p.z])
					});
				}
			} else {
				// Create BufferGeometry for regular lines
				const geometry = new BufferGeometry().setFromPoints(points);

				roads.push({
					geometry,
					roadType,
					isHighlighted: false,
					color: style.color,
					isThick: false
				});
			}
		}

		console.log(
			`Built ${roads.length} roads and ${highlightedRoads.length} highlighted roads (skipped ${skippedNodes} due to missing nodes)`
		);
		return { roads, highlightedRoads };
	}

	function isEdgeInPath(nodeId1: string, nodeId2: string, path: string[]): boolean {
		if (path.length < 2) return false;

		for (let i = 0; i < path.length - 1; i++) {
			const currentNode = path[i];
			const nextNode = path[i + 1];

			if (
				(currentNode === nodeId1 && nextNode === nodeId2) ||
				(currentNode === nodeId2 && nextNode === nodeId1)
			) {
				return true;
			}
		}
		return false;
	}

	// Make roads creation reactive to highlightedPath changes
	const roadsData = $derived(createSimpleRoads());
	const roads = $derived(roadsData.roads);
	const highlightedRoads = $derived(roadsData.highlightedRoads);

	// Debug highlighted path (reactive)
	$effect(() => {
		console.log('Highlighted path received:', highlightedPath);
		console.log('Highlighted roads created:', highlightedRoads.length);
	});

	// Debug coordinate ranges and data structure (reactive)
	$effect(() => {
		if (roads.length > 0) {
			console.log(`Total roads created: ${roads.length}`);

			// Sample first few roads for debugging
			roads.slice(0, 3).forEach((road, i) => {
				const points = road.geometry.attributes.position.array;
				console.log(`Road ${i}:`, {
					type: road.roadType,
					highlighted: road.isHighlighted,
					color: road.color,
					start: [points[0], points[1], points[2]],
					end: [points[3], points[4], points[5]]
				});
			});

			// Check coordinate ranges
			let minX = Infinity,
				maxX = -Infinity;
			let minY = Infinity,
				maxY = -Infinity;
			let minZ = Infinity,
				maxZ = -Infinity;

			roads.forEach((road) => {
				const points = road.geometry.attributes.position.array;
				for (let i = 0; i < points.length; i += 3) {
					minX = Math.min(minX, points[i]);
					maxX = Math.max(maxX, points[i]);
					minY = Math.min(minY, points[i + 1]);
					maxY = Math.max(maxY, points[i + 1]);
					minZ = Math.min(minZ, points[i + 2]);
					maxZ = Math.max(maxZ, points[i + 2]);
				}
			});

			console.log('Coordinate ranges:', {
				x: [minX, maxX],
				y: [minY, maxY],
				z: [minZ, maxZ]
			});
		} else {
			console.warn('No roads created!');
			console.log('Debug data structure:', {
				edgesCount: data.navigation.edges.length,
				nodesCount: Object.keys(data.navigation.nodes).length,
				sampleEdge: data.navigation.edges[0],
				sampleNode: Object.entries(data.navigation.nodes)[0]
			});
		}
	});
</script>

<T.Group>
	{#each roads as road}
		<T.Line geometry={road.geometry}>
			<T.LineBasicMaterial color={road.color} transparent={false} opacity={1.0} />
		</T.Line>
	{/each}

	{#each highlightedRoads as road}
		<T.Mesh>
			<MeshLineGeometry points={road.points} />
			<MeshLineMaterial width={4.0} color={road.color} depthTest={true} />
		</T.Mesh>
	{/each}
</T.Group>
