<script lang="ts">
	import { T } from '@threlte/core';
	import { Vector3, CatmullRomCurve3 } from 'three';
	import data from '$lib/data';

	export let defaultColor = '#666666';
	export let defaultWidth = 0.3;
	export let segments = 64;
	export let highlightedPath: string[] = [];
	export let highlightColor = '#ff4444';
	export let highlightWidth = 0.5;
	export let maxRoads = 1000;
	export let useContinuousRoads = true; // Toggle between continuous roads and simple edge rendering
	
	// Road type styling
	const roadStyles: Record<string, { color: string; width: number }> = {
		service: { color: '#888888', width: 0.2 },
		footway: { color: '#aaaaaa', width: 0.15 },
		residential: { color: '#666666', width: 0.3 },
		primary: { color: '#444444', width: 0.5 },
		secondary: { color: '#555555', width: 0.4 },
		default: { color: defaultColor, width: defaultWidth }
	};

	interface EdgeInfo {
		id: number;
		node: [string, string];
		info_id: number;
	}

	function buildAdjacencyMap(): Map<string, string[]> {
		const adjacency = new Map<string, string[]>();
		
		for (const edge of data.navigation.edges) {
			const [nodeA, nodeB] = edge.node;
			
			if (!adjacency.has(nodeA)) adjacency.set(nodeA, []);
			if (!adjacency.has(nodeB)) adjacency.set(nodeB, []);
			
			adjacency.get(nodeA)!.push(nodeB);
			adjacency.get(nodeB)!.push(nodeA);
		}
		
		return adjacency;
	}

	function findContinuousRoads(): Array<{
		path: string[];
		roadType: string;
		isHighlighted: boolean;
		curve: CatmullRomCurve3;
		color: string;
		width: number;
	}> {
		const adjacency = buildAdjacencyMap();
		const visited = new Set<string>();
		const roads = [];
		let roadCount = 0;

		// Group edges by road type for continuity
		const edgesByType = new Map<number, EdgeInfo[]>();
		for (const edge of data.navigation.edges) {
			if (!edgesByType.has(edge.info_id)) {
				edgesByType.set(edge.info_id, []);
			}
			edgesByType.get(edge.info_id)!.push(edge as EdgeInfo);
		}

		for (const [infoId, edges] of edgesByType) {
			if (roadCount >= maxRoads) break;
			
			const roadType = data.navigation.info[infoId]?.type || 'default';
			const style = roadStyles[roadType] || roadStyles.default;
			
			// Debug: log road type construction
			if (infoId < 5) {
				console.log(`Processing road type ${roadType} with ${edges.length} edges`);
			}
			
			// Create subgraph for this road type
			const typeAdjacency = new Map<string, string[]>();
			for (const edge of edges) {
				const [nodeA, nodeB] = edge.node;
				
				if (!typeAdjacency.has(nodeA)) typeAdjacency.set(nodeA, []);
				if (!typeAdjacency.has(nodeB)) typeAdjacency.set(nodeB, []);
				
				typeAdjacency.get(nodeA)!.push(nodeB);
				typeAdjacency.get(nodeB)!.push(nodeA);
			}

			// Find continuous paths within this road type
			const typeVisited = new Set<string>();
			
			for (const startNode of typeAdjacency.keys()) {
				if (typeVisited.has(startNode)) continue;
				if (roadCount >= maxRoads) break;

				const path = traceContinuousPath(startNode, typeAdjacency, typeVisited);
				if (path.length < 2) continue;

				// Check if any part of this path is highlighted
				const isHighlighted = isPathHighlighted(path, highlightedPath);

				// Create curve from path points
				const points = path.map(nodeId => {
					const node = data.navigation.nodes[nodeId];
					return new Vector3(
						node.coordinates[0],
						node.coordinates[2] - 40,
						node.coordinates[1]
					);
				});

				if (points.length >= 2) {
					const curve = new CatmullRomCurve3(points);
					
					roads.push({
						path,
						roadType,
						isHighlighted,
						curve,
						color: isHighlighted ? highlightColor : style.color,
						width: isHighlighted ? highlightWidth : style.width
					});
					
					roadCount++;
				}
			}
		}

		return roads;
	}

	function traceContinuousPath(
		startNode: string, 
		adjacency: Map<string, string[]>, 
		visited: Set<string>
	): string[] {
		const path = [startNode];
		visited.add(startNode);
		
		let current = startNode;
		let prev: string | null = null;

		// Trace forward
		while (true) {
			const neighbors = adjacency.get(current) || [];
			const unvisitedNeighbors = neighbors.filter(n => !visited.has(n) && n !== prev);
			
			if (unvisitedNeighbors.length === 0) break;
			if (unvisitedNeighbors.length > 1) {
				// Multiple paths - stop here to avoid branching
				break;
			}
			
			const next = unvisitedNeighbors[0];
			path.push(next);
			visited.add(next);
			prev = current;
			current = next;
		}

		// Trace backward from start
		current = startNode;
		prev = path.length > 1 ? path[1] : null;
		
		while (true) {
			const neighbors = adjacency.get(current) || [];
			const unvisitedNeighbors = neighbors.filter(n => !visited.has(n) && n !== prev);
			
			if (unvisitedNeighbors.length === 0) break;
			if (unvisitedNeighbors.length > 1) {
				// Multiple paths - stop here
				break;
			}
			
			const next = unvisitedNeighbors[0];
			path.unshift(next);
			visited.add(next);
			prev = current;
			current = next;
		}

		return path;
	}

	function isPathHighlighted(roadPath: string[], highlightPath: string[]): boolean {
		if (highlightPath.length < 2) return false;
		
		// Check if this road contains any segment of the highlight path
		for (let i = 0; i < highlightPath.length - 1; i++) {
			const segStart = highlightPath[i];
			const segEnd = highlightPath[i + 1];
			
			const startIdx = roadPath.indexOf(segStart);
			const endIdx = roadPath.indexOf(segEnd);
			
			if (startIdx !== -1 && endIdx !== -1 && Math.abs(startIdx - endIdx) === 1) {
				return true;
			}
		}
		
		return false;
	}

	function createSimpleRoads() {
		const roads = [];
		let roadCount = 0;
		
		for (const edge of data.navigation.edges) {
			if (roadCount >= maxRoads) break;
			const [nodeId1, nodeId2] = edge.node;
			const node1 = data.navigation.nodes[nodeId1];
			const node2 = data.navigation.nodes[nodeId2];
			
			if (!node1 || !node2) continue;
			
			// Check if this edge is part of the highlighted path
			const isHighlighted = isEdgeInPath(nodeId1, nodeId2, highlightedPath);
			
			// Create points for the curve
			const points = [
				new Vector3(
					node1.coordinates[0],
					node1.coordinates[2] - 40,
					node1.coordinates[1]
				),
				new Vector3(
					node2.coordinates[0],
					node2.coordinates[2] - 40,
					node2.coordinates[1]
				)
			];
			
			const curve = new CatmullRomCurve3(points);
			const roadType = data.navigation.info[edge.info_id]?.type || 'default';
			const style = roadStyles[roadType] || roadStyles.default;
			
			roads.push({
				path: [nodeId1, nodeId2],
				roadType,
				isHighlighted,
				curve,
				color: isHighlighted ? highlightColor : style.color,
				width: isHighlighted ? highlightWidth : style.width
			});
			
			roadCount++;
		}
		
		return roads;
	}

	function isEdgeInPath(nodeId1: string, nodeId2: string, path: string[]): boolean {
		if (path.length < 2) return false;
		
		for (let i = 0; i < path.length - 1; i++) {
			const currentNode = path[i];
			const nextNode = path[i + 1];
			
			if ((currentNode === nodeId1 && nextNode === nodeId2) || 
				(currentNode === nodeId2 && nextNode === nodeId1)) {
				return true;
			}
		}
		return false;
	}

	const roads = useContinuousRoads ? findContinuousRoads() : createSimpleRoads();
	
	// Debug information
	console.log(`Built ${roads.length} ${useContinuousRoads ? 'continuous' : 'simple'} roads`);
	roads.forEach((road, index) => {
		if (index < 5) { // Log first 5 roads for debugging
			console.log(`Road ${index}: ${road.path.length} nodes, type: ${road.roadType}, highlighted: ${road.isHighlighted}`);
		}
	});
</script>

<T.Group>
	{#each roads as road}
		<T.Mesh>
			<T.TubeGeometry args={[road.curve, segments, road.width, 8, false]} />
			<T.MeshLambertMaterial 
				color={road.color} 
				transparent={road.isHighlighted}
				opacity={road.isHighlighted ? 0.9 : 1.0}
			/>
		</T.Mesh>
	{/each}
</T.Group>