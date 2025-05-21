import data from './data_next.json';

const scale = 175;
const translation = [77000, 0, 10];

console.log('Importing Navigation');

const navigation = {
	nodes: Object.fromEntries(
		Object.entries(data.paths.nodes).map(([key, value]) => [
			key,
			{
				...value,
				coordinates: value.locations.map((v, idx) => v * scale + translation[idx])
			}
		])
	),

	edges: data.paths.edges,
	info: data.paths.infos
};

console.log('Finish Importing Navigation');

export default {
	...data,
	locations: data.location.map((location) => {
		const coordinates = location.geometry.coordinates.map(([x, y, z]) => [
			x * scale + translation[0],
			y * scale + translation[1],
			z * scale + translation[2]
		]);
		const start_height = location.geometry.start_height * scale + translation[1];
		// const height = location.geometry.height * scale + translation[1];
		const height = location.geometry.height * scale + translation[1];
		return { ...location, geometry: { coordinates, start_height, height } };
	}),
	navigation: navigation
};
