<script lang="ts">
	import data from '$lib/data';
	import { states } from '../states.svelte';

	let {
		onPositionChange
	}: {
		onPositionChange?: (data: { position: number[]; target: number[]; isActive: boolean }) => void;
	} = $props();

	// Toggle for path camera mode
	let pathCameraActive = $state(true);

	// Get the navigation path nodes
	const pathNodes = $derived(() => {
		if (states.navigationPath.length === 0) return [];
		return states.navigationPath.map((nodeId) => data.navigation.nodes[nodeId]).filter(Boolean);
	});

	// Slider value (0 to 1)
	let sliderValue = $state(0);

	// Calculate camera position and look-at target based on slider value
	const cameraData = $derived(() => {
		const nodes = pathNodes();
		if (nodes.length < 2) return null;

		// Convert slider value (0-1) to path progress
		const totalSegments = nodes.length - 1;
		const progress = sliderValue * totalSegments;
		const segmentIndex = Math.floor(progress);
		const segmentProgress = progress - segmentIndex;

		// Handle edge cases
		if (segmentIndex >= totalSegments) {
			const lastNode = nodes[nodes.length - 1];
			const prevNode = nodes[nodes.length - 2];

			// Position at road level
			const position = [
				lastNode.coordinates[0],
				lastNode.coordinates[2] + 8, // Car-like height
				lastNode.coordinates[1]
			];

			// Look in the direction from previous to current node
			const directionX = lastNode.coordinates[0] - prevNode.coordinates[0];
			const directionZ = lastNode.coordinates[1] - prevNode.coordinates[1];
			const directionY = lastNode.coordinates[2] - prevNode.coordinates[2];

			// Normalize and extend the look direction
			const dirLength = Math.sqrt(
				directionX * directionX + directionZ * directionZ + directionY * directionY
			);
			const normalizedDirX = dirLength > 0 ? directionX / dirLength : 1;
			const normalizedDirZ = dirLength > 0 ? directionZ / dirLength : 0;
			const normalizedDirY = dirLength > 0 ? directionY / dirLength : 0;

			const target = [
				lastNode.coordinates[0] + normalizedDirX * 30,
				lastNode.coordinates[2] + normalizedDirY * 30 + 10,
				lastNode.coordinates[1] + normalizedDirZ * 30
			];

			return { position, target };
		}

		// Interpolate between current and next node for position
		const currentNode = nodes[segmentIndex];
		const nextNode = nodes[segmentIndex + 1];

		const x =
			currentNode.coordinates[0] +
			(nextNode.coordinates[0] - currentNode.coordinates[0]) * segmentProgress;
		const z =
			currentNode.coordinates[1] +
			(nextNode.coordinates[1] - currentNode.coordinates[1]) * segmentProgress;
		const y =
			currentNode.coordinates[2] +
			(nextNode.coordinates[2] - currentNode.coordinates[2]) * segmentProgress +
			8; // Slightly elevated for car-like view

		const position = [x, y, z];

		// Calculate look-at target (point ahead on the path)
		const directionX = nextNode.coordinates[0] - currentNode.coordinates[0];
		const directionZ = nextNode.coordinates[1] - currentNode.coordinates[1];
		const directionY = nextNode.coordinates[2] - currentNode.coordinates[2];

		// Normalize direction vector
		const dirLength = Math.sqrt(
			directionX * directionX + directionZ * directionZ + directionY * directionY
		);
		const normalizedDirX = dirLength > 0 ? directionX / dirLength : 0;
		const normalizedDirZ = dirLength > 0 ? directionZ / dirLength : 0;
		const normalizedDirY = dirLength > 0 ? directionY / dirLength : 0;

		// Project forward along the path direction
		const lookAheadDistance = 30;
		const target = [
			x + normalizedDirX * lookAheadDistance,
			y + normalizedDirY * lookAheadDistance + 2, // Look slightly up for better view
			z + normalizedDirZ * lookAheadDistance
		];

		return { position, target };
	});

	// Call the position change callback when camera data changes
	$effect(() => {
		const data = cameraData();
		if (data && onPositionChange) {
			onPositionChange({ ...data, isActive: pathCameraActive });
		}
	});

	// Show current progress as percentage
	const progressPercentage = $derived(Math.round(sliderValue * 100));
	const currentSegment = $derived(() => {
		const nodes = pathNodes();
		if (nodes.length < 2) return null;
		const totalSegments = nodes.length - 1;
		const progress = sliderValue * totalSegments;
		const segmentIndex = Math.floor(progress);
		return Math.min(segmentIndex + 1, nodes.length - 1);
	});
</script>

{#if states.navigationPath.length > 0 && pathNodes().length > 1}
	<div class="navigation-slider-container">
		<div class="slider-info">
			<!-- <div class="camera-toggle">
				<label class="toggle-label">
					<input type="checkbox" bind:checked={pathCameraActive} class="toggle-checkbox" />
					<span class="toggle-text">
						{pathCameraActive ? '📹 Path Camera ON' : '🎮 Free Camera'}
					</span>
				</label>
			</div> -->
			<div class="progress-text">
				<span class="font-semibold">🚗 Driving Progress:</span>
				<span class="text-blue-600">{progressPercentage}%</span>
				{#if currentSegment !== null}
					<span class="text-gray-500">
						(Segment {currentSegment()} of {pathNodes().length})
					</span>
				{/if}
			</div>
			<!-- <div class="speed-indicator">
				<span class="text-xs text-gray-600">
					{#if sliderValue === 0}
						🛑 Ready to Start
					{:else if sliderValue === 1}
						🏁 Arrived at Destination
					{:else}
						🚗 Driving... ({Math.round(sliderValue * 100)}% complete)
					{/if}
				</span>
			</div> -->
		</div>

		<div class="slider-wrapper">
			<div class="slider-track">
				<input
					type="range"
					min="0"
					max="1"
					step="0.001"
					bind:value={sliderValue}
					class="slider-input"
				/>
				<div class="slider-progress" style="width: {progressPercentage}%"></div>
			</div>

			<div class="slider-labels">
				<span class="text-xs text-gray-500">Start</span>
				<span class="text-xs text-gray-500">End</span>
			</div>
		</div>

		<div class="slider-controls">
			<button onclick={() => (sliderValue = 0)} class="control-btn" disabled={sliderValue === 0}>
				🏁 Start
			</button>
			<button
				onclick={() => (sliderValue = Math.max(0, sliderValue - 0.05))}
				class="control-btn"
				disabled={sliderValue === 0}
			>
				⬅️ Step Back
			</button>
			<button
				onclick={() => (sliderValue = Math.min(1, sliderValue + 0.05))}
				class="control-btn"
				disabled={sliderValue === 1}
			>
				➡️ Step Forward
			</button>
			<button onclick={() => (sliderValue = 1)} class="control-btn" disabled={sliderValue === 1}>
				🎯 End
			</button>
		</div>
	</div>
{/if}

<style>
	.navigation-slider-container {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(12px);
		border-radius: 1rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		padding: 1.5rem;
		min-width: 28rem;
		border: 1px solid rgba(0, 0, 0, 0.08);
		transition: all 0.3s ease;
	}

	.navigation-slider-container:hover {
		box-shadow:
			0 25px 30px -5px rgba(0, 0, 0, 0.15),
			0 15px 15px -5px rgba(0, 0, 0, 0.06);
	}

	.slider-info {
		margin-bottom: 0.75rem;
	}

	.progress-text {
		font-size: 0.875rem;
		line-height: 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.camera-toggle {
		margin-bottom: 0.5rem;
		text-align: center;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.toggle-checkbox {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.toggle-text {
		color: #374151;
	}

	.speed-indicator {
		margin-top: 0.25rem;
		text-align: center;
	}

	.slider-wrapper {
		margin-bottom: 0.75rem;
	}

	.slider-track {
		position: relative;
		width: 100%;
		height: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.slider-input {
		width: 100%;
		height: 0.5rem;
		border-radius: 0.5rem;
		appearance: none;
		cursor: pointer;
		position: relative;
		z-index: 10;
		background: #e5e7eb;
	}

	.slider-input::-webkit-slider-thumb {
		appearance: none;
		width: 1.2rem;
		height: 1.2rem;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
		transition: all 0.2s ease;
	}

	.slider-input::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 6px 12px rgba(37, 99, 235, 0.4);
	}

	.slider-input::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		background: #2563eb;
		border-radius: 50%;
		cursor: pointer;
		border: 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider-progress {
		position: absolute;
		top: 50%;
		left: 0;
		height: 0.5rem;
		background: linear-gradient(90deg, #10b981, #3b82f6);
		border-radius: 0.5rem;
		pointer-events: none;
		transform: translateY(-50%);
		transition: width 0.2s ease;
		box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		line-height: 1rem;
		color: #6b7280;
	}

	.slider-controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.control-btn {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		line-height: 1rem;
		background: #f3f4f6;
		border-radius: 0.25rem;
		transition: all 0.15s ease;
		border: none;
		cursor: pointer;
	}

	.control-btn:hover:not(:disabled) {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.control-btn:disabled {
		background: #f9fafb;
		color: #9ca3af;
		cursor: not-allowed;
	}
</style>
