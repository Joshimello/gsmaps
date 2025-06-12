<script lang="ts">
	import { useTask } from '@threlte/core';
	import { HTML } from '@threlte/extras';
	import { cubicOut } from 'svelte/easing';
	import { Vector3 } from 'three';
	import { states } from '../states.svelte';

	let {
		position,
		number,
		imageUrl,
		name
	}: {
		position: [number, number, number];
		number: number;
		imageUrl: string;
		name: string;
	} = $props();

	let opacity = $state(0.65);
	const maxDistance = 500;
	const labelPosition = new Vector3(...position);

	useTask(() => {
		const cameraPos = new Vector3();
		states.controls?.getPosition(cameraPos);
		const distance = cameraPos.distanceTo(labelPosition);
		const normalizedDistance = Math.min(distance / maxDistance, 1);
		const easedDistance = cubicOut(normalizedDistance);
		opacity = 1.5 * (1 - easedDistance);
		if (opacity < 0.1) {
			opacity = 0;
		}
	});
</script>

<HTML center {position}>
	<div
		class="flex min-w-32 items-center overflow-hidden rounded-xl bg-white text-xl"
		style="opacity: {opacity}"
	>
		<div class="flex w-full flex-col">
			{#if imageUrl}
				<img
					crossOrigin="anonymous"
					src={imageUrl}
					alt="Location preview"
					class="h-16 w-full object-cover"
				/>
			{/if}
			<div class="flex items-center justify-center px-3 py-1">
				<h4 class="text-nowrap text-xs">{name}</h4>
			</div>
		</div>
	</div>
</HTML>
