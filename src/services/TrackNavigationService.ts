import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, take, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { createShuffledIndices } from '../utils/seededRandom';
import { Track, PlayerState } from '../contracts';

export class TrackNavigationService {
	// BehaviorSubject to hold and emit the current list of tracks.
	private trackList$ = new BehaviorSubject<Track[]>([]);

	// BehaviorSubject to hold and emit the current player state.
	private playerState$ = new BehaviorSubject<PlayerState>({
		currentTrackIndex: -1, // Index of the currently playing track in the track list.
		isPlaying: false,      // Indicates whether the player is currently playing.
		isShuffled: false,     // Indicates whether shuffle mode is enabled.
		isLooped: false,      // Indicates whether loop mode is enabled.
		shuffleKey: '',       // A key used to manage shuffling logic (could be a timestamp or random string).
	});

	private shuffledIndices: number[] = [];

	constructor() {
		this.resetShuffledIndices();
	}

	// Updates the track list with a new array of tracks.
	setTracks(tracks: Track[]): void {
		this.trackList$.next(tracks);
		this.resetShuffledIndices();
	}
	// Updates the player state with a new PlayerState object.
	setPlayerState(state: PlayerState): void {
		this.playerState$.next(state);
		if (state.isShuffled && state.shuffleKey !== this.playerState$.value.shuffleKey) {
			this.resetShuffledIndices();
		}
	}

	// Returns an observable that emits the current player state.
	getPlayerState(): Observable<PlayerState> {
		return this.playerState$.asObservable();
	}

	// Returns an observable that emits the current track (or null if no track is selected).
	getCurrentTrack(): Observable<Track | null> {
		// Combines the latest values from trackList$ and playerState$ observables.
		return combineLatest([this.trackList$, this.playerState$]).pipe(
			// Maps the combined values to the current track or null.
			map(([tracks, playerState]) => {
				// If the currentTrackIndex is valid, return the track at that index, otherwise return null.
				return playerState.currentTrackIndex >= 0 ? tracks[playerState.currentTrackIndex] : null;
			}),
			// Emits only when the ID of the current track changes (prevents unnecessary emissions).
			distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
			// Shares the latest emitted value with new subscribers (improves efficiency).
			shareReplay(1)
		);
	}

	// Changes the current track to the next or previous track in the list.
	changeTrack(direction: 'next' | 'previous'): Observable<Track | null> {
		return combineLatest([this.trackList$, this.playerState$]).pipe(
			map(([tracks, playerState]) => {
				const { currentTrackIndex, isShuffled, isLooped } = playerState;
				const indices = isShuffled ? this.shuffledIndices : [...Array(tracks.length).keys()];

				let nextIndex = indices.indexOf(currentTrackIndex) + (direction === 'next' ? 1 : -1);
				if (nextIndex >= indices.length || nextIndex < 0) {
					if (isLooped) {
						nextIndex = direction === 'next' ? 0 : indices.length - 1;
					} else {
						return null;
					}
				}

				return this.findNextPlayableTrack(tracks, indices, nextIndex, direction);
			}),
			take(1)
		);
	}

	// Gets the next playable track.
	nextTrack(): Observable<Track | null> {
		return this.changeTrack('next');
	}

	// Gets the previous playable track.
	previousTrack(): Observable<Track | null> {
		return this.changeTrack('previous');
	}

	private resetShuffledIndices(): void {
		const tracks = this.trackList$.value;
		const { isShuffled, shuffleKey } = this.playerState$.value;
		if (isShuffled && shuffleKey) {
			this.shuffledIndices = createShuffledIndices(tracks.length, shuffleKey);
		} else {
			this.shuffledIndices = [...Array(tracks.length).keys()];
		}
	}

	// Finds the next playable track in the given direction ('next' or 'previous').
	private findNextPlayableTrack(tracks: Track[], indices: number[], startIndex: number, direction: 'next' | 'previous'): Track | null {
		const { isLooped } = this.playerState$.value;
		let currentIndex = startIndex;
		const increment = direction === 'next' ? 1 : -1;

		for (let i = 0; i < indices.length; i++) {
			const track = tracks[indices[currentIndex]];
			if (this.isTrackPlayable(track)) {
				this.updatePlayerState(indices[currentIndex]);
				return track;
			}
			currentIndex = (currentIndex + increment + indices.length) % indices.length;
			if (!isLooped && ((direction === 'next' && currentIndex < startIndex) || (direction === 'previous' && currentIndex > startIndex))) {
				break;
			}
		}

		return null;
	}

	// Creates an iterator function that returns the next track index based on the direction.
	// Updates the player state with the new track index.
	private updatePlayerState(newIndex: number): void {
		this.playerState$.next({
			...this.playerState$.value,
			currentTrackIndex: newIndex,
			isPlaying: true,
		});
	}

	// Checks if a track is playable (has a preview_url).
	private isTrackPlayable(track: Track): boolean {
		return !!track.preview_url;
	}

	getTracks(): Track[] {
		return this.trackList$.value;
	}
}