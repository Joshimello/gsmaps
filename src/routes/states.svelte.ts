import type CC from 'camera-controls';

export const states: {
	mode: 'three' | 'omni';
	controls: CC | undefined;
	currentId: number;
	navigationPath: string[];
} = $state({
	mode: 'three',
	controls: undefined,
	currentId: 0,
	navigationPath: []
});
