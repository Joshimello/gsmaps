<script lang="ts">
	import { HTML } from '@threlte/extras';

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
</script>

<HTML center {position}>
	<div class="flex min-w-32 items-center overflow-hidden rounded-xl bg-white text-xl opacity-65">
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
