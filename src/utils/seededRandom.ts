// utils/seededRandom.ts

/**
 * Creates a seeded random number generator.
 *
 * @param seed - A string to use as the random seed.
 * @returns A function that generates a random number between 0 and 1.
 */
export function createSeededRandom(seed: string): () => number {
	let state = hashString(seed);

	return () => {
		const x = Math.sin(state++) * 10000;
		return x - Math.floor(x);
	};
}

/**
 * Hashes a string to create an initial state for the random number generator.
 *
 * @param str - The string to hash.
 * @returns A number to use as the initial state.
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash;
}

/**
 * Creates an array of shuffled indices based on a seed.
 *
 * @param length - The length of the array to shuffle.
 * @param seed - A string to use as the random seed.
 * @returns An array of shuffled indices.
 */
export function createShuffledIndices(length: number, seed: string): number[] {
	const random = createSeededRandom(seed);
	const indices = Array.from({ length }, (_, i) => i);

	for (let i = length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[indices[i], indices[j]] = [indices[j], indices[i]];
	}

	return indices;
}