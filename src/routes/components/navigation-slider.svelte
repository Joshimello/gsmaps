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

	// Camera height smoothing options
	let smoothHeight = $state(true);
	let lockPitch = $state(true);
	let fixedCameraHeight = $state(15); // Fixed height when pitch is locked

	// Get the navigation path nodes
	const pathNodes = $derived(() => {
		if (states.navigationPath.length === 0) return [];
		return states.navigationPath.map((nodeId) => data.navigation.nodes[nodeId]).filter(Boolean);
	});

	// Slider value (0 to 1)
	let sliderValue = $state(0);

	// Animation state for smooth stepping
	let isAnimating = $state(false);
	let animationStartValue = 0;
	let animationTargetValue = 0;
	let animationStartTime = 0;

	// Calculate distance between two 3D points
	function distance3D(p1: number[], p2: number[]): number {
		return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2);
	}

	// Calculate angle between three points (in degrees)
	function calculateAngle(p1: number[], p2: number[], p3: number[]): number {
		const v1 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
		const v2 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];

		const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
		const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
		const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);

		if (mag1 === 0 || mag2 === 0) return 0;

		const cosAngle = dot / (mag1 * mag2);
		const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
		return (angle * 180) / Math.PI;
	}

	// Filter path nodes to keep only important ones for smooth camera movement
	const filteredCameraNodes = $derived(() => {
		const nodes = pathNodes();
		if (nodes.length <= 2) return nodes;

		const filtered = [nodes[0]]; // Always keep first node
		const minDistance = 25; // Minimum distance between camera nodes
		const minAngleChange = 15; // Minimum angle change to consider a turn significant

		for (let i = 1; i < nodes.length - 1; i++) {
			const currentNode = nodes[i];
			const lastFilteredNode = filtered[filtered.length - 1];

			const dist = distance3D(
				[currentNode.coordinates[0], currentNode.coordinates[2], currentNode.coordinates[1]],
				[
					lastFilteredNode.coordinates[0],
					lastFilteredNode.coordinates[2],
					lastFilteredNode.coordinates[1]
				]
			);

			// Check if this node represents a significant direction change
			let significantTurn = false;
			if (filtered.length >= 1 && i < nodes.length - 1) {
				const prevNode = lastFilteredNode;
				const nextNode = nodes[i + 1];

				const angle = calculateAngle(
					[prevNode.coordinates[0], prevNode.coordinates[2], prevNode.coordinates[1]],
					[currentNode.coordinates[0], currentNode.coordinates[2], currentNode.coordinates[1]],
					[nextNode.coordinates[0], nextNode.coordinates[2], nextNode.coordinates[1]]
				);

				significantTurn = angle < 180 - minAngleChange;
			}

			// Keep node if it's far enough or represents a significant turn
			if (dist >= minDistance || significantTurn) {
				filtered.push(currentNode);
			}
		}

		// Always keep the last node
		if (filtered[filtered.length - 1] !== nodes[nodes.length - 1]) {
			filtered.push(nodes[nodes.length - 1]);
		}

		return filtered;
	});

	// Catmull-Rom spline interpolation function
	function catmullRomSpline(
		p0: number[],
		p1: number[],
		p2: number[],
		p3: number[],
		t: number
	): number[] {
		const t2 = t * t;
		const t3 = t2 * t;

		return [
			0.5 *
				(2 * p1[0] +
					(-p0[0] + p2[0]) * t +
					(2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
					(-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
			0.5 *
				(2 * p1[1] +
					(-p0[1] + p2[1]) * t +
					(2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
					(-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
			0.5 *
				(2 * p1[2] +
					(-p0[2] + p2[2]) * t +
					(2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
					(-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3)
		];
	}

	// Generate smooth camera path using filtered nodes and Catmull-Rom splines
	const smoothCameraPath = $derived(() => {
		const nodes = filteredCameraNodes();
		if (nodes.length < 2) return [];

		// Convert filtered node coordinates to camera coordinates (with height adjustment)
		const cameraPoints = nodes.map((node, index) => {
			let height;
			if (lockPitch) {
				// Use fixed height when pitch is locked
				height = fixedCameraHeight;
			} else if (smoothHeight && index > 0) {
				// Smooth height transitions
				const prevHeight = nodes[index - 1].coordinates[2] + 8;
				const currentHeight = node.coordinates[2] + 8;
				const heightDiff = currentHeight - prevHeight;
				// Limit height changes to prevent jerky movements
				const maxHeightChange = 5;
				if (Math.abs(heightDiff) > maxHeightChange) {
					height = prevHeight + Math.sign(heightDiff) * maxHeightChange;
				} else {
					height = currentHeight;
				}
			} else {
				height = node.coordinates[2] + 8; // Car-like height
			}

			return [node.coordinates[0], height, node.coordinates[1]];
		});

		if (cameraPoints.length === 2) {
			// For just 2 points, create simple interpolated path
			const smoothPoints: number[][] = [];
			const segments = 20;
			for (let i = 0; i <= segments; i++) {
				const t = i / segments;
				smoothPoints.push([
					cameraPoints[0][0] + (cameraPoints[1][0] - cameraPoints[0][0]) * t,
					cameraPoints[0][1] + (cameraPoints[1][1] - cameraPoints[0][1]) * t,
					cameraPoints[0][2] + (cameraPoints[1][2] - cameraPoints[0][2]) * t
				]);
			}
			return smoothPoints;
		}

		const smoothPoints: number[][] = [];
		const segmentsPerNode = 15; // More segments for smoother movement

		for (let i = 0; i < cameraPoints.length - 1; i++) {
			// Get control points for Catmull-Rom spline
			const p0 =
				i === 0
					? // Extend backwards from first point
						[
							2 * cameraPoints[0][0] - cameraPoints[1][0],
							2 * cameraPoints[0][1] - cameraPoints[1][1],
							2 * cameraPoints[0][2] - cameraPoints[1][2]
						]
					: cameraPoints[i - 1];

			const p1 = cameraPoints[i];
			const p2 = cameraPoints[i + 1];

			const p3 =
				i === cameraPoints.length - 2
					? // Extend forwards from last point
						[
							2 * cameraPoints[cameraPoints.length - 1][0] -
								cameraPoints[cameraPoints.length - 2][0],
							2 * cameraPoints[cameraPoints.length - 1][1] -
								cameraPoints[cameraPoints.length - 2][1],
							2 * cameraPoints[cameraPoints.length - 1][2] -
								cameraPoints[cameraPoints.length - 2][2]
						]
					: cameraPoints[i + 2];

			// Generate interpolated points for this segment
			for (let j = 0; j < segmentsPerNode; j++) {
				const t = j / segmentsPerNode;
				const smoothPoint = catmullRomSpline(p0, p1, p2, p3, t);
				smoothPoints.push(smoothPoint);
			}
		}

		// Add the final point
		smoothPoints.push(cameraPoints[cameraPoints.length - 1]);
		return smoothPoints;
	});

	// Calculate camera position and look-at target based on slider value
	const cameraData = $derived(() => {
		const nodes = pathNodes();
		const smoothPath = smoothCameraPath();
		if (nodes.length < 2 || smoothPath.length === 0) return null;

		// Convert slider value (0-1) to smooth path progress
		const totalPoints = smoothPath.length - 1;
		const progress = sliderValue * totalPoints;
		const pointIndex = Math.floor(progress);
		const pointProgress = progress - pointIndex;

		// Handle edge cases
		if (pointIndex >= totalPoints) {
			const lastPoint = smoothPath[smoothPath.length - 1];
			const prevPoint = smoothPath[Math.max(0, smoothPath.length - 2)];

			const position = [...lastPoint];

			// Look in the direction from previous to current point
			const directionX = lastPoint[0] - prevPoint[0];
			const directionY = lastPoint[1] - prevPoint[1];
			const directionZ = lastPoint[2] - prevPoint[2];

			// Normalize and extend the look direction
			const dirLength = Math.sqrt(
				directionX * directionX + directionY * directionY + directionZ * directionZ
			);
			const normalizedDirX = dirLength > 0 ? directionX / dirLength : 1;
			const normalizedDirY = dirLength > 0 ? directionY / dirLength : 0;
			const normalizedDirZ = dirLength > 0 ? directionZ / dirLength : 0;

			const target = [
				lastPoint[0] + normalizedDirX * 30,
				lastPoint[1] + normalizedDirY * 30 + 2,
				lastPoint[2] + normalizedDirZ * 30
			];

			return { position, target };
		}

		// Interpolate between current and next smooth point for position
		const currentPoint = smoothPath[pointIndex];
		const nextPoint = smoothPath[pointIndex + 1];

		const position = [
			currentPoint[0] + (nextPoint[0] - currentPoint[0]) * pointProgress,
			currentPoint[1] + (nextPoint[1] - currentPoint[1]) * pointProgress,
			currentPoint[2] + (nextPoint[2] - currentPoint[2]) * pointProgress
		];

		// Calculate look-at target (point ahead on the smooth path)
		const lookAheadDistance = Math.max(8, Math.floor(smoothPath.length * 0.05)); // Dynamic look-ahead
		const lookAheadIndex = Math.min(pointIndex + lookAheadDistance, smoothPath.length - 1);
		const lookAheadPoint = smoothPath[lookAheadIndex];

		// Calculate smooth target direction
		let target: number[];
		if (lookAheadIndex === pointIndex || lookAheadDistance < 3) {
			// Near the end - use forward projection from current direction
			const prevIndex = Math.max(0, pointIndex - 2);
			const prevPoint = smoothPath[prevIndex];

			const directionX = position[0] - prevPoint[0];
			const directionY = lockPitch ? 0 : position[1] - prevPoint[1]; // Lock Y direction if pitch locked
			const directionZ = position[2] - prevPoint[2];

			const dirLength = Math.sqrt(
				directionX * directionX + directionY * directionY + directionZ * directionZ
			);

			if (dirLength > 0) {
				const normalizedDirX = directionX / dirLength;
				const normalizedDirY = lockPitch ? 0 : directionY / dirLength; // No vertical look when pitch locked
				const normalizedDirZ = directionZ / dirLength;

				const targetHeight = lockPitch ? fixedCameraHeight : position[1] + normalizedDirY * 25 + 1;
				target = [
					position[0] + normalizedDirX * 25,
					targetHeight,
					position[2] + normalizedDirZ * 25
				];
			} else {
				const targetHeight = lockPitch ? fixedCameraHeight : position[1] + 1;
				target = [position[0] + 25, targetHeight, position[2]];
			}
		} else {
			// Look towards the ahead point with controlled height
			const targetHeight = lockPitch
				? fixedCameraHeight
				: smoothHeight
					? position[1] + Math.max(-2, Math.min(2, lookAheadPoint[1] - position[1])) + 1
					: lookAheadPoint[1] + 1;
			target = [lookAheadPoint[0], targetHeight, lookAheadPoint[2]];
		}

		return { position, target };
	});

	// Call the position change callback when camera data changes
	$effect(() => {
		const data = cameraData();
		if (data && onPositionChange) {
			onPositionChange({ ...data, isActive: pathCameraActive });
		}
	});

	// Animation function for smooth stepping
	function animateSliderTo(targetValue: number, duration: number = 250) {
		if (isAnimating) return; // Prevent overlapping animations

		isAnimating = true;
		animationStartValue = sliderValue;
		animationTargetValue = targetValue;
		animationStartTime = performance.now();

		function animate(currentTime: number) {
			const elapsed = currentTime - animationStartTime;
			const progress = Math.min(elapsed / duration, 1);

			// Ease-out function for smooth deceleration
			const easeOut = 1 - Math.pow(1 - progress, 3);

			sliderValue = animationStartValue + (animationTargetValue - animationStartValue) * easeOut;

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				isAnimating = false;
				sliderValue = animationTargetValue; // Ensure exact final value
			}
		}

		requestAnimationFrame(animate);
	}

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
			<!-- <div class="camera-controls">
				<div class="camera-toggle">
					<label class="toggle-label">
						<input type="checkbox" bind:checked={smoothHeight} class="toggle-checkbox" />
						<span class="toggle-text">🎢 Smooth Height</span>
					</label>
				</div>
				<div class="camera-toggle">
					<label class="toggle-label">
						<input type="checkbox" bind:checked={lockPitch} class="toggle-checkbox" />
						<span class="toggle-text">🔒 Lock Pitch</span>
					</label>
				</div>
				{#if lockPitch}
					<div class="height-control">
						<label class="height-label">
							Height:
							<input
								type="range"
								min="5"
								max="30"
								step="1"
								bind:value={fixedCameraHeight}
								class="height-slider"
							/>
							<span class="height-value">{fixedCameraHeight}m</span>
						</label>
					</div>
				{/if}
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
			<button
				onclick={() => animateSliderTo(0)}
				class="control-btn"
				disabled={sliderValue === 0 || isAnimating}
			>
				🏁 Start
			</button>
			<button
				onclick={() => animateSliderTo(Math.max(0, sliderValue - 0.02))}
				class="control-btn"
				disabled={sliderValue === 0 || isAnimating}
			>
				⬅️ Step Back
			</button>
			<button
				onclick={() => animateSliderTo(Math.min(1, sliderValue + 0.02))}
				class="control-btn"
				disabled={sliderValue === 1 || isAnimating}
			>
				➡️ Step Forward
			</button>
			<button
				onclick={() => animateSliderTo(1)}
				class="control-btn"
				disabled={sliderValue === 1 || isAnimating}
			>
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

	.camera-controls {
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		background: rgba(249, 250, 251, 0.8);
		border-radius: 0.5rem;
		border: 1px solid rgba(229, 231, 235, 0.5);
	}

	.camera-toggle {
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.toggle-checkbox {
		width: 0.875rem;
		height: 0.875rem;
		cursor: pointer;
	}

	.toggle-text {
		color: #374151;
	}

	.height-control {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(229, 231, 235, 0.5);
	}

	.height-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #4b5563;
	}

	.height-slider {
		width: 100px;
		height: 4px;
		background: #e5e7eb;
		border-radius: 2px;
		appearance: none;
		cursor: pointer;
	}

	.height-slider::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
	}

	.height-value {
		font-weight: 600;
		color: #3b82f6;
		min-width: 2rem;
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
