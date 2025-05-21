<script lang="ts">
	import { omniverseConfig, sampleScenePaths } from '$lib/omni';
	import { AppStreamer } from '@nvidia/omniverse-webrtc-streaming-library';
	import { onMount } from 'svelte';
	import { states } from '../states.svelte';
	import { checkKitReadiness, loadScene, teleportCamera } from './omni-methods';

	let { hidden }: { hidden: boolean } = $props();

	let videoRef: HTMLVideoElement | undefined = $state();
	let audioRef: HTMLAudioElement | undefined = $state();
	let isConnected = $state(false);
	let isLoading = $state(true);
	let isSetupDone = $state(false);

	const setupStream = async () => {
		isLoading = true;

		try {
			const streamConfig = {
				signalingServer: omniverseConfig.serverIp,
				signalingPort: omniverseConfig.signalingPort,
				mediaServer: omniverseConfig.serverIp,
				mediaPort: omniverseConfig.mediaPort,
				cursor: 'free',
				mic: false,
				videoElementId: 'omniverse-video',
				audioElementId: 'omniverse-audio',
				authenticate: false,
				maxReconnects: 20,
				nativeTouchEvents: true,
				width: 1920,
				height: 1080,
				fps: 60,
				onUpdate: (message: any) => {
					console.log('Stream update:', message);
				},
				onStart: (message: any) => {
					if (message.action === 'start' && message.status === 'success') {
						console.log('Stream started successfully');
						isConnected = true;
						isLoading = false;

						setTimeout(() => {
							checkKitReadiness();
							console.log('Checking Kit readiness before loading scene');

							setTimeout(() => {
								loadScene(sampleScenePaths.sample0);
								console.log('Sent request to load scene');
							}, 2000);
						}, 2000);
					}
				},
				onStop: (message: any) => {
					console.log('Stream stopped:', message);
					isConnected = false;
				},
				onTerminate: (message: any) => {
					console.log('Stream terminated:', message);
					isConnected = false;
				}
			};

			const streamProps = {
				streamConfig,
				streamSource: 'direct' as const
			};

			// @ts-ignore
			await AppStreamer.connect(streamProps);
			isSetupDone = true; // Mark setup as done
		} catch (error) {
			console.error('Failed to connect to Omniverse stream:', error);
			isLoading = false;
			isConnected = false;
		}
	};

	onMount(() => {
		if (!hidden && !isSetupDone) {
			setupStream();
		}

		return () => {
			try {
				AppStreamer.stop();
			} catch (error) {
				console.error('Error stopping stream:', error);
			}
		};
	});

	$effect(() => {
		if (hidden) {
			if (videoRef) videoRef.pause();
			if (audioRef) audioRef.pause();
		} else {
			if (!isSetupDone) {
				setupStream();
			} else {
				if (videoRef) videoRef.play().catch((err) => {});
				if (audioRef) audioRef.play().catch((err) => {});
			}
		}
	});

	setInterval(() => {
		if (hidden) return;
		let camera = states.controls?.camera;
		// You don't want to use camera.rotation in this case, since
		// Euler angles in Three.js are rotated with respect to the
		// local coordinate system, not the global coordinate system.
		// Ref: https://threejs.org/docs/index.html#api/en/math/Euler.order

		if (!camera) {
			console.error('Camera not found');
			return;
		}

		console.log(camera.rotation.order);

		teleportCamera(
			[
				camera.position.x / camera.zoom / 25000,
				camera.position.y / camera.zoom / 25000 + 0.5,
				camera.position.z / camera.zoom / 25000
			],
			[camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w]
		);
	}, 10);
</script>

{#if isLoading && !hidden}
	<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
		<div class="flex flex-col items-center rounded-lg bg-white p-6 shadow-lg">
			<p class="text-gray-700">Connecting to Omniverse...</p>
		</div>
	</div>
{/if}

<video
	id="omniverse-video"
	bind:this={videoRef}
	class="h-full w-full object-cover"
	class:hidden
	playsinline
	muted
	autoplay
></video>
<audio id="omniverse-audio" bind:this={audioRef} muted></audio>
