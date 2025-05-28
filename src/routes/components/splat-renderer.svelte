<script lang="ts">
	// @ts-ignore
	import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
	import { T, useThrelte } from '@threlte/core';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Three from 'three';

	const { invalidate } = useThrelte();

	let viewer: Three.Group;

	onMount(async () => {
		viewer = new GaussianSplats3D.DropInViewer({
			freeIntermediateSplatData: true,
			sharedMemoryForWorkers: false,
			showLoadingUI: true
		});
		const addParams = [{ path: 'nthu_campus_part.compressed.ksplat' }];

		try {
			toast.promise(
				// @ts-ignore
				async () => await viewer.addSplatScenes(addParams, false),
				{
					loading: 'Loading splat scenes...',
					success: 'Splats loaded successfully!',
					error: (err: any) => `Error loading splat scenes: ${err.message}`
				}
			);
			invalidate();
		} catch (err: any) {
			console.error('Error loading splat scenes:', err);
		}
	});

	onDestroy(() => {
		// @ts-ignore
		viewer.dispose();
	});
</script>

<T is={viewer} />
