<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';

	let {
		coordinates,
		startHeight,
		endHeight,
		onSelect = () => {}
	}: {
		coordinates: number[][];
		startHeight: number;
		endHeight: number;
		onSelect: () => void;
	} = $props();

	let meshRef: THREE.Group | undefined = $state();

	const geometry = () => {
		const verticalLines: [THREE.Vector3, THREE.Vector3][] = coordinates.map(([x, z]) => [
			new THREE.Vector3(x, startHeight, z),
			new THREE.Vector3(x, startHeight + endHeight, z)
		]);

		const horizontalLines: [THREE.Vector3, THREE.Vector3][] = [];
		for (let i = 0; i < coordinates.length; i++) {
			const [x1, z1] = coordinates[i];
			const [x2, z2] = coordinates[(i + 1) % coordinates.length];

			horizontalLines.push([
				new THREE.Vector3(x1, startHeight, z1),
				new THREE.Vector3(x2, startHeight, z2)
			]);

			horizontalLines.push([
				new THREE.Vector3(x1, startHeight + endHeight, z1),
				new THREE.Vector3(x2, startHeight + endHeight, z2)
			]);
		}

		return [...verticalLines, ...horizontalLines];
	};

	const shapeGeometry = () => {
		const shape = new THREE.Shape();
		coordinates.forEach(([x, z], i) => {
			if (i === 0) {
				shape.moveTo(x, z);
			} else {
				shape.lineTo(x, z);
			}
		});
		shape.closePath();

		const extrudeSettings = {
			steps: 1,
			depth: -endHeight,
			bevelEnabled: true
		};

		const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

		return geometry;
	};
</script>

<T.Group bind:ref={meshRef} onclick={onSelect}>
	<!-- <T.AxesHelper args={[100]} /> -->
	<!-- {#each geometry() as line, i (i)}
		<T.Mesh>
			<T.TubeGeometry args={[new THREE.LineCurve3(line[0], line[1]), 1, 20, 8, false]} />
			<T.MeshBasicMaterial color={'white'} />
		</T.Mesh>
	{/each} -->
	<T.Mesh geometry={shapeGeometry()} position={[0, startHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
		<T.MeshBasicMaterial visible={false} />
	</T.Mesh>
</T.Group>
