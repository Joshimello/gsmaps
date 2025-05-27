<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type CC from 'camera-controls';
	import { onDestroy } from 'svelte';
	import { PerspectiveCamera } from 'three';
	import CameraControls from './camera-controls';

	let {
		controls = $bindable()
	}: {
		controls: CC | undefined;
	} = $props();

	const { dom, invalidate } = useThrelte();
	const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000000);

	controls = new CameraControls(dom, camera);

	// Fix FOV by disabling zoom effects on FOV
	controls.minZoom = 1;
	controls.maxZoom = 1;

	const fixedHeight = 100;
	controls.setPosition(100, 100, fixedHeight, false);
	controls.rotateTo(0, 0, false);

	controls.mouseButtons.left = CameraControls.ACTION.SCREEN_PAN;
	controls.mouseButtons.right = CameraControls.ACTION.ROTATE;
	controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;

	controls.truckSpeed = 2;

	useTask(
		(delta) => {
			if (controls.update(delta)) {
				invalidate();
			}
		},
		{ autoInvalidate: false }
	);

	onDestroy(() => {
		controls.dispose();
	});
</script>

<T is={camera} makeDefault />
