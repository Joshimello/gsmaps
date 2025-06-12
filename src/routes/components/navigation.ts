import data from '$lib/data';

export type Node = {
	id: string;
	locations: number[];
	edges: number[];
	coordinates: number[];
};

export class PriorityQueue<T> {
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

export function pickTwoRandomNodes(): Node[] {
	const nodes = Object.values(data.navigation.nodes);
	if (nodes.length < 2) return [];

	const index1 = Math.floor(Math.random() * nodes.length);
	let index2 = Math.floor(Math.random() * nodes.length);

	// Ensure index2 is different
	while (index2 === index1) {
		index2 = Math.floor(Math.random() * nodes.length);
	}

	return [nodes[index1], nodes[index2]];
}

export function findShortestPath(startNode: Node, endNode: Node): { nodes: Node[], pathIds: string[] } {
	const nodes = data.navigation.nodes;
	const edges = data.navigation.edges;

	const startId = Object.keys(nodes).find((id) => nodes[id] === startNode);
	const endId = Object.keys(nodes).find((id) => nodes[id] === endNode);

	if (!startId || !endId) return { nodes: [], pathIds: [] };

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

	// Reconstruct path
	const pathNodes: Node[] = [];
	const pathIds: string[] = [];
	let curr: string | null = endId;
	while (curr) {
		pathNodes.unshift(data.navigation.nodes[curr]);
		pathIds.unshift(curr);
		curr = prev[curr];
	}

	return { nodes: pathNodes, pathIds };
}

export function navigation(randomNodes: Node[]): { nodes: Node[], pathIds: string[] } {
	if (randomNodes.length < 2) return { nodes: [], pathIds: [] };
	
	const result = findShortestPath(randomNodes[0], randomNodes[1]);
	
	// Log the path for debugging
	console.log('Shortest path:', result.pathIds);
	
	return result;
}